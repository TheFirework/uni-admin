import { Processor, Process, OnQueueActive, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import type { Job } from 'bull';  // 使用 import type，因为 Job 用于装饰器签名中的类型
import { Logger } from '@nestjs/common';
import { REPORT_QUEUE_NAME } from '../queues/report.queue.js';  // 值导入
import type { ReportResult, ReportJobData } from '../queues/report.queue.js';  // 类型导入

/**
 * 报表生成任务处理器
 *
 * 功能说明:
 *   处理 report-queue 队列中的报表生成任务
 *   支持 Excel、PDF、CSV 三种输出格式
 *
 * 性能特点:
 *   - 大文件生成可能耗时较长（建议设置 timeout: 300000 即 5 分钟）
 *   - 内存占用较高（大数据集导出时注意 OOM）
 *   - 支持流式写入（减少内存压力）
 *
 * 异步生成模式（推荐用于大文件）:
 *   1. 用户提交报表请求 → 返回 taskId
 *   2. 后台异步生成报表 → 进度更新到 Redis/DB
 *   3. 生成完成 → 通知用户（WebSocket / 邮件 / 短信）
 *   4. 用户下载 → 提供 OSS/S3 临时下载链接
 *
 * 并发控制:
 *   - 队列配置 concurrency: 3（同时最多 3 个报表任务）
 *   - 避免过多并发导致服务器资源耗尽
 *
 * 扩展建议:
 *   - 接入 Excel 库（ExcelJS、SheetJS）
 *   - 接入 PDF 库（PDFKit、puppeteer）
 *   - 实现分片导出（超大文件拆分为多个小文件）
 *   - 添加进度回调机制
 */
@Processor(REPORT_QUEUE_NAME)
export class ReportProcessor {
  /** 日志实例 */
  private readonly logger = new Logger(ReportProcessor.name);

  /** 任务开始执行回调 */
  @OnQueueActive()
  onActive(job: Job<ReportJobData>) {
    this.logger.log(
      `开始生成报表 [${job.id}] -> 类型: ${job.data.type}, 用户: ${job.data.userId}`
    );
  }

  /** 任务完成回调 */
  @OnQueueCompleted()
  onCompleted(job: Job<ReportJobData>, result: ReportResult) {
    this.logger.log(
      `报表生成完成 [${job.id}] -> 文件: ${result.fileUrl}, 大小: ${this.formatFileSize(result.fileSize)}, 耗时: ${result.durationMs}ms`
    );
  }

  /** 任务失败回调 */
  @OnQueueFailed()
  onFailed(job: Job<ReportJobData> | undefined, error: Error) {
    const jobId = job?.id ?? 'unknown';
    this.logger.error(
      `报表生成失败 [${jobId}] -> 错误: ${error.message}`,
      error.stack
    );
  }

  /**
   * 处理报表生成任务
   *
   * 处理流程:
   *   1. 校验请求参数（type、userId）
   *   2. 查询数据（根据 params 中的筛选条件）
   *   3. 根据格式生成对应文件
   *   4. 上传至文件存储（本地/OSS/S3）
   *   5. 返回文件下载信息
   *
   * @param job - Bull 任务对象，包含 ReportJobData 数据
   * @returns 报表生成结果（文件 URL、大小、耗时等）
   */
  @Process()
  async handleReportJob(job: Job<ReportJobData>): Promise<ReportResult> {
    const { type, params, userId } = job.data;
    const startTime = Date.now();

    try {
      // ====== 1. 参数校验 ======
      this.validateReportJob(type, userId);

      // ====== 2. 模拟数据查询 ======
      // TODO: 替换为真实的数据查询逻辑
      // const records = await this.reportService.queryData(params);
      const mockRecordCount = this.generateMockRecordCount(params);

      this.logger.log(
        `开始生成 ${type.toUpperCase()} 报表 -> 记录数: ${mockRecordCount}, 用户: ${userId}`
      );

      // ====== 3. 模拟报表生成（延迟模拟耗时操作）======
      // 实际场景中这里会调用对应的库生成文件
      const filePath = await this.generateReport(type, params, mockRecordCount);

      // ====== 4. 上传至存储（模拟）======
      // TODO: 替换为真实的文件上传逻辑
      // const fileUrl = await this.storageService.upload(filePath);
      const fileUrl = `/downloads/reports/${userId}_${Date.now()}.${type}`;

      // ====== 5. 清理临时文件 ======
      // TODO: await fs.unlink(filePath);

      const duration = Date.now() - startTime;
      const fileSize = this.estimateFileSize(mockRecordCount, type);

      return {
        fileUrl,
        fileSize,
        durationMs: duration,
        recordCount: mockRecordCount,
      };
    } catch (error) {
      this.logger.error(
        `报表生成异常 -> 类型: ${type}, 用户: ${userId}, 错误: ${(error as Error).message}`
      );
      throw error;  // 抛出错误触发 Bull 的重试机制
    }
  }

  /**
   * 校验报表任务参数
   */
  private validateReportJob(type: string, userId: string): void {
    if (!['excel', 'pdf', 'csv'].includes(type)) {
      throw new Error(`不支持的报表格式: ${type}`);
    }
    if (!userId || userId.trim().length === 0) {
      throw new Error('用户 ID 不能为空');
    }
  }

  /**
   * 生成报表文件（模拟实现）
   *
   * 不同格式的处理策略:
   * - Excel: 使用 ExcelJS 库，支持样式、公式、多 Sheet
   * - PDF:  使用 PDFKit 或 Puppeteer，适合打印和分享
   * - CSV:  简单文本格式，体积最小，兼容性最好
   *
   * @param type - 输出格式
   * @param params - 报表参数
   * @param recordCount - 记录数量
   * @returns 生成的文件路径
   */
  private async generateReport(
    type: ReportJobData['type'],
    params: Record<string, any>,
    recordCount: number
  ): Promise<string> {
    // 模拟耗时操作：根据记录数量动态调整延迟
    const baseDelay = 1000;           // 基础延迟 1 秒
    const perRecordDelay = 0.01;     // 每条记录额外延迟 10ms
    const totalDelay = Math.min(baseDelay + recordCount * perRecordDelay, 5000);  // 最大 5 秒

    this.logger.debug(`正在生成 ${type.toUpperCase()} 格式报表... 预计耗时: ${Math.round(totalDelay)}ms`);

    // 模拟异步生成过程
    await this.delay(totalDelay);

    const fileName = `report_${Date.now()}.${type}`;
    this.logger.log(`${type.toUpperCase()} 报表生成完成: ${fileName}`);

    // TODO: 实际的文件生成逻辑示例：
    //
    // if (type === 'excel') {
    //   const workbook = new ExcelJS.Workbook();
    //   const worksheet = workbook.addWorksheet('Sheet1');
    //   // ... 写入数据 ...
    //   await workbook.xlsx.writeFile(fileName);
    // } else if (type === 'pdf') {
    //   const doc = new PDFDocument();
    //   doc.pipe(fs.createWriteStream(fileName));
    //   // ... 写入内容 ...
    //   doc.end();
    // } else if (type === 'csv') {
    //   // 使用 fast-csv 或手动拼接
    //   const csvContent = this.convertToCsv(records);
    //   fs.writeFileSync(fileName, csvContent);
    // }

    return `/tmp/reports/${fileName}`;
  }

  /**
   * 估算生成的文件大小
   * 用于向用户提供预期的文件大小信息
   */
  private estimateFileSize(recordCount: number, type: ReportJobData['type']): number {
    const bytesPerRecord: Record<string, number> = {
      excel: 500,   // Excel 包含格式信息，单条较大
      pdf: 300,     // PDF 包含排版信息
      csv: 100,     // CSV 纯文本，最紧凑
    };

    return recordCount * (bytesPerRecord[type] ?? 200);
  }

  /**
   * 生成模拟记录数量
   * 实际场景中应从数据库查询真实数据量
   */
  private generateMockRecordCount(params: Record<string, any>): number {
    // 根据参数模拟不同的数据量
    if (params.limit) {
      return Math.min(Number(params.limit), 100000);  // 上限 10 万条
    }

    // 默认返回随机数量的记录（用于演示）
    return Math.floor(Math.random() * 9000) + 1000;  // 1000-10000 条
  }

  /**
   * 工具方法：延迟指定毫秒数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 格式化文件大小显示
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
