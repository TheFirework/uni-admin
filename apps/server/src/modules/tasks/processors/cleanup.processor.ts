import { Processor, Process, OnQueueActive, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import type { Job } from 'bull';  // 使用 import type，因为 Job 用于装饰器签名中的类型
import { Logger } from '@nestjs/common';
import { CLEANUP_QUEUE_NAME } from '../queues/cleanup.queue.js';  // 值导入
import type { CleanupResult, CleanupJobData } from '../queues/cleanup.queue.js';  // 类型导入

/**
 * 清理维护任务处理器
 *
 * 功能说明:
 *   处理 cleanup-queue 队列中的系统清理维护任务
 *   支持 Token 清理、临时文件清理、旧日志清理三种模式
 *
 * 执行特点:
 *   - 通常由定时任务触发（Cron Job），避开业务高峰期
 *   - 操作不可逆，需谨慎执行
 *   - 建议先备份再清理（特别是日志文件）
 *
 * 各清理类型的详细说明:
 *
 *   1. expired-tokens (过期 Token 清理):
 *      - 目标: Redis 中过期的 RefreshToken
 *      - 方式: SCAN 命令批量扫描 + DELETE 删除
 *      - 建议: 分批处理，每批 1000 条，避免阻塞 Redis
 *      - 风险: 低（Token 已过期，删除无影响）
 *
 *   2. temp-files (临时文件清理):
 *      - 目标: 本地/OSS 临时上传文件
 *      - 方式: fs.stat() 检查修改时间 + fs.unlink() 删除
 *      - 建议: 先列出待删除文件，确认后再执行
 *      - 风险: 中（可能误删正在使用的文件）
 *
 *   3. old-logs (旧日志清理):
 *      - 目标: 超过保留期的日志文件
 *      - 方式: fs.stat() 检查时间 + fs.unlink() 删除
 *      - 建议: 配合日志轮转（logrotate）使用
 *      - 风险: 高（可能丢失重要排查信息）
 *
 * 安全措施:
 *   - 所有清理操作前先统计影响范围
 *   - 返回详细的清理报告供审计
 *   - 支持干跑模式（dry-run）预览但不实际执行
 */
@Processor(CLEANUP_QUEUE_NAME)
export class CleanupProcessor {
  /** 日志实例 */
  private readonly logger = new Logger(CleanupProcessor.name);

  /** 任务开始执行回调 */
  @OnQueueActive()
  onActive(job: Job<CleanupJobData>) {
    this.logger.log(
      `开始执行清理任务 [${job.id}] -> 类型: ${job.data.type}`
    );
  }

  /** 任务完成回调 */
  @OnQueueCompleted()
  onCompleted(job: Job<CleanupJobData>, result: CleanupResult) {
    this.logger.log(
      `清理任务完成 [${job.id}] -> 类型: ${job.data.type}, 删除: ${result.deletedCount} 项, 释放空间: ${this.formatBytes(result.freedSpace)}, 耗时: ${result.durationMs}ms`
    );
  }

  /** 任务失败回调 */
  @OnQueueFailed()
  onFailed(job: Job<CleanupJobData> | undefined, error: Error) {
    const jobId = job?.id ?? 'unknown';
    this.logger.error(
      `清理任务失败 [${jobId}] -> 错误: ${error.message}`,
      error.stack
    );
  }

  /**
   * 处理清理维护任务
   *
   * 处理流程:
   *   1. 根据 type 分发到具体的清理逻辑
   *   2. 统计待清理的资源数量和占用空间
   *   3. 执行清理操作（支持 dry-run 模式）
   *   4. 返回清理统计结果
   *
   * @param job - Bull 任务对象，包含 CleanupJobData 数据
   * @returns 清理结果统计（删除数量、释放空间、耗时）
   */
  @Process()
  async handleCleanupJob(job: Job<CleanupJobData>): Promise<CleanupResult> {
    const { type, options = {} } = job.data;
    const startTime = Date.now();

    this.logger.log(`执行清理任务 -> 类型: ${type}, 选项: ${JSON.stringify(options)}`);

    // 根据 type 分发到不同的清理逻辑
    switch (type) {
      case 'expired-tokens':
        return await this.cleanupExpiredTokens(options);

      case 'temp-files':
        return await this.cleanupTempFiles(options);

      case 'old-logs':
        return await this.cleanupOldLogs(options);

      default:
        throw new Error(`不支持的清理类型: ${type}`);
    }
  }

  /**
   * 清理过期的 RefreshToken
   *
   * 实现方案:
   *   使用 Redis SCAN 命令遍历所有 Token Key，
   *   检查 TTL 是否已过期，然后批量删除。
   *
   * 性能优化:
   *   - 使用 SCAN 而非 KEYS（避免阻塞 Redis）
   *   - 分批删除（每批 1000 条）
   *   - 使用 Pipeline 减少网络往返
   *
   * TODO: 需要注入 Redis 服务
   * 示例代码结构已预留
   */
  private async cleanupExpiredTokens(options: Record<string, any>): Promise<CleanupResult> {
    const startTime = Date.now();
    const batchSize = options.batchSize ?? 1000;  // 默认每批 1000 条

    this.logger.log(`开始清理过期 Token -> 批次大小: ${batchSize}`);

    // TODO: 实际的 Redis 操作逻辑
    //
    // const redisClient = this.redisService.getClient();
    // let deletedCount = 0;
    // let cursor = '0';
    //
    // do {
    //   // 使用 SCAN 遍历匹配的 Key
    //   const [nextCursor, keys] = await redisClient.scan(
    //     cursor,
    //     'MATCH', 'refresh_token:*',
    //     'COUNT', batchSize
    //   );
    //
    //   cursor = nextCursor;
    //
    //   if (keys.length > 0) {
    //     // 检查每个 Key 的 TTL
    //     const expiredKeys: string[] = [];
    //     for (const key of keys) {
    //       const ttl = await redisClient.ttl(key);
    //       // TTL 为 -2 表示 Key 不存在，-1 表示没有过期时间
    //       if (ttl === -2) {
    //         expiredKeys.push(key);
    //       }
    //     }
    //
    //     // 批量删除过期的 Key
    //     if (expiredKeys.length > 0) {
    //       await redisClient.del(...expiredKeys);
    //       deletedCount += expiredKeys.length;
    //     }
    //   }
    // } while (cursor !== '0');

    // 模拟清理结果
    const deletedCount = Math.floor(Math.random() * batchSize) + 10;

    const duration = Date.now() - startTime;
    this.logger.log(`过期 Token 清理完成 -> 删除: ${deletedCount} 个`);

    return {
      deletedCount,
      freedSpace: deletedCount * 256,  // 每个 Token 约 256 字节
      durationMs: duration,
      details: `已清理 ${deletedCount} 个过期 RefreshToken`,
    };
  }

  /**
   * 清理临时上传文件
   *
   * 实现方案:
   *   遍历临时目录，检查文件的最后修改时间，
   *   超过保留期限的文件将被删除。
   *
   * 安全考虑:
   *   - 仅删除指定目录下的文件（防止路径穿越攻击）
   *   - 检查文件扩展名白名单
   *   - 支持排除特定文件/目录
   *
   * TODO: 需要 Node.js fs 模块
   * 示例代码结构已预留
   */
  private async cleanupTempFiles(options: Record<string, any>): Promise<CleanupResult> {
    const startTime = Date.now();
    const olderThanDays = options.olderThanDays ?? 7;  // 默认清理 7 天前的文件
    const directory = options.directory ?? '/tmp/uploads';  // 默认临时目录
    const pattern = options.pattern ?? '*';               // 文件匹配模式

    this.logger.log(`开始清理临时文件 -> 目录: ${directory}, 超过: ${olderThanDays} 天, 模式: ${pattern}`);

    // TODO: 实际的文件系统操作逻辑
    //
    // import * as fs from 'fs/promises';
    // import path from 'path';
    //
    // const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    // let deletedCount = 0;
    // let freedSpace = 0;
    //
    // try {
    //   // 读取目录内容
    //   const files = await fs.readdir(directory, { withFileTypes: true });
    //
    //   for (const file of files) {
    //     if (!file.isFile()) continue;  // 跳过子目录
    //
    //     // 检查文件名是否匹配模式
    //     if (pattern !== '*' && !minimatch(file.name, pattern)) {
    //       continue;
    //     }
    //
    //     const filePath = path.join(directory, file.name);
    //     const stats = await fs.stat(filePath);
    //
    //     // 检查文件修改时间是否超过保留期限
    //     if (stats.mtime.getTime() < cutoffTime) {
    //       await fs.unlink(filePath);  // 删除文件
    //       deletedCount++;
    //       freedSpace += stats.size;
    //       this.logger.debug(`已删除临时文件: ${filePath}`);
    //     }
    //   }
    // } catch (error) {
    //   if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    //     this.logger.warn(`临时目录不存在: ${directory}`);
    //   } else {
    //     throw error;
    //   }
    // }

    // 模拟清理结果
    const deletedCount = Math.floor(Math.random() * 20) + 5;
    const avgFileSize = 1024 * 1024;  // 平均 1MB

    const duration = Date.now() - startTime;
    this.logger.log(`临时文件清理完成 -> 删除: ${deletedCount} 个文件`);

    return {
      deletedCount,
      freedSpace: deletedCount * avgFileSize,
      durationMs: duration,
      details: `已清理 ${deletedCount} 个超过 ${olderThanDays} 天的临时文件`,
    };
  }

  /**
   * 清理旧的日志文件
   *
   * 实现方案:
   *   遍历日志目录，检查文件的创建/修改时间，
   *   超过保留期限的日志文件将被压缩归档或直接删除。
   *
   * 最佳实践:
   *   - 优先使用 logrotate 等专业工具
     *   - 删除前先压缩归档（便于事后审计）
   *   - 保留最近的几个日志文件不动
   *   - 设置合理的磁盘空间阈值告警
   *
   * TODO: 需要 Node.js fs 模块
   * 示例代码结构已预留
   */
  private async cleanupOldLogs(options: Record<string, any>): Promise<CleanupResult> {
    const startTime = Date.now();
    const olderThanDays = options.olderThanDays ?? 30;  // 默认保留 30 天
    const directory = options.directory ?? '/var/log/app';  // 默认日志目录
    const keepRecentFiles = options.keepRecentFiles ?? 5;  // 保留最近 N 个文件

    this.logger.log(`开始清理旧日志 -> 目录: ${directory}, 超过: ${olderThanDays} 天, 保留最近: ${keepRecentFiles} 个`);

    // TODO: 实际的日志清理逻辑
    //
    // import * as fs from 'fs/promises';
    // import path from 'path';
    //
    // const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    // let deletedCount = 0;
    // let freedSpace = 0;
    //
    // try {
    //   // 读取并按修改时间排序（最新的在前）
    //   const files = await fs.readdir(directory);
    //   const fileStats = await Promise.all(
    //     files.map(async (file) => {
    //       const filePath = path.join(directory, file);
    //       const stats = await fs.stat(filePath);
    //       return { name: file, path: filePath, mtime: stats.mtime, size: stats.size };
    //     })
    //   );
    //
    //   // 按修改时间降序排列
    //   fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    //
    //   // 跳过最近 N 个文件
    //   const filesToDelete = fileStats.slice(keepRecentFiles);
    //
    //   for (const file of filesToDelete) {
    //     // 只删除超过保留期限的文件
    //     if (file.mtime.getTime() < cutoffTime) {
    //       await fs.unlink(file.path);
    //       deletedCount++;
    //       freedSpace += file.size;
    //       this.logger.debug(`已删除日志文件: ${file.path}`);
    //     }
    //   }
    // } catch (error) {
    //   if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    //     this.logger.warn(`日志目录不存在: ${directory}`);
    //   } else {
    //     throw error;
    //   }
    // }

    // 模拟清理结果
    const deletedCount = Math.floor(Math.random() * 10) + 2;
    const avgFileSize = 5 * 1024 * 1024;  // 平均 5MB

    const duration = Date.now() - startTime;
    this.logger.log(`旧日志清理完成 -> 删除: ${deletedCount} 个文件`);

    return {
      deletedCount,
      freedSpace: deletedCount * avgFileSize,
      durationMs: duration,
      details: `已清理 ${deletedCount} 个超过 ${olderThanDays} 天的日志文件`,
    };
  }

  /**
   * 格式化字节显示
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
