import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

// 导入队列定义和配置
import { EMAIL_QUEUE_OPTIONS } from './queues/email.queue.js';
import { REPORT_QUEUE_OPTIONS } from './queues/report.queue.js';
import { CLEANUP_QUEUE_OPTIONS } from './queues/cleanup.queue.js';

// 导入任务处理器
import { EmailProcessor } from './processors/email.processor.js';
import { ReportProcessor } from './processors/report.processor.js';
import { CleanupProcessor } from './processors/cleanup.processor.js';

// 导入调度服务
import { TaskSchedulerService } from './task-scheduler.service.js';

/**
 * 任务队列模块
 *
 * 功能说明:
 *   聚合 Bull 任务队列系统的所有组件，
 *   提供统一的异步任务处理能力。
 *
 * 模块架构:
 *   ┌─────────────────────────────────────────────┐
 *   │            TaskQueueModule                   │
 *   ├─────────────────────────────────────────────┤
 *   │ Imports (BullModule.registerQueue):          │
 *   │  ├─ email-queue    (邮件发送)               │
 *   │  ├─ report-queue   (报表生成)               │
 *   │  └─ cleanup-queue  (系统清理)               │
 *   ├─────────────────────────────────────────────┤
 *   │ Providers (Processors + Services):           │
 *   │  ├─ EmailProcessor    (邮件处理器)          │
 *   │  ├─ ReportProcessor   (报表处理器)          │
 *   │  ├─ CleanupProcessor  (清理处理器)          │
 *   │  └─ TaskSchedulerService (调度服务)         │
 *   ├─────────────────────────────────────────────┤
 *   │ Exports:                                     │
 *   │  └─ TaskSchedulerService (供其他模块使用)    │
 *   └─────────────────────────────────────────────┘
 *
 * 注册流程:
 *   1. 在 AppModule 中启用 BullModule.forRootAsync()（Redis 连接配置）
 *   2. 导入 TaskQueueModule（自动注册 3 个队列和 3 个处理器）
 *   3. 注入 TaskSchedulerService 使用
 *
 * 使用方式:
 *
 *   1. 在 AppModule 中导入:
 *   ```typescript
 *   @Module({
 *     imports: [
 *       BullModule.forRootAsync({...}),  // Redis 配置
 *       TaskQueueModule,                 // 导入此模块
 *     ],
 *   })
 *   export class AppModule {}
 *   ```
 *
 *   2. 在其他 Service 中使用:
 *   ```typescript
 *   @Injectable()
 *   export class UserService {
 *     constructor(private readonly taskScheduler: TaskSchedulerService) {}
 *
 *     async registerUser(dto: RegisterDto) {
 *       const user = await this.createUser(dto);
 *       // 异步发送欢迎邮件（不阻塞注册流程）
 *       await this.taskScheduler.addEmailJob({
 *         to: user.email,
 *         subject: '欢迎使用',
 *         template: 'welcome',
 *         data: { username: user.name },
 *       });
 *       return user;
 *     }
 *   }
 *   ```
 *
 * 依赖要求:
 *   - 必须先在根模块配置 BullModule.forRootAsync()
 *   - 需要 Redis 服务运行中
 *   - 已安装 @nestjs/bull 和 bull 包
 */
@Module({
  /**
   * 导入 Bull 队列配置
   *
   * BullModule.registerQueue():
   *   - 注册一个或多个命名队列
   *   - 每个队列可以独立配置（并发数、超时时间等）
   *   - 返回的 Queue 实例可通过 @InjectQueue() 注入
   *
   * 配置说明:
   *   email-queue: 高优先级，快速响应，指数退避重试
   *   report-queue: 中等优先级，允许长耗时，固定延迟重试
   *   cleanup-queue: 低优先级，支持延迟执行，通常不重试
   */
  imports: [
    // 注册邮件发送队列
    BullModule.registerQueue(EMAIL_QUEUE_OPTIONS),

    // 注册报表生成队列
    BullModule.registerQueue(REPORT_QUEUE_OPTIONS),

    // 注册清理维护队列
    BullModule.registerQueue(CLEANUP_QUEUE_OPTIONS),
  ],

  /**
   * 注册服务提供者
   *
   * Processors:
   *   - 被 @Processor() 装饰器标记的类
   *   - 自动监听对应队列的任务
   *   - @Process() 方法会在任务被消费时调用
   *
   * TaskSchedulerService:
   *   - 统一的任务调度入口
   *   - 封装了队列操作的复杂性
   *   - 提供类型安全的 API 接口
   */
  providers: [
    // 邮件发送处理器 → 处理 email-queue 的任务
    EmailProcessor,

    // 报表生成处理器 → 处理 report-queue 的任务
    ReportProcessor,

    // 清理维护处理器 → 处理 cleanup-queue 的任务
    CleanupProcessor,

    // 任务调度服务 → 提供统一的任务添加和查询接口
    TaskSchedulerService,
  ],

  /**
   * 导出服务
   *
   * 将 TaskSchedulerService 导出，使其他模块可以:
   *   - 注入并使用任务调度功能
   *   - 添加各类异步任务
   *   - 查询任务状态和队列统计
   *
   * 典型使用场景:
   *   - AuthModule: 登录/注册后发送邮件
   *   - AdminModule: 数据导出报表
   *   - ScheduleModule: 定时触发清理任务
   */
  exports: [
    TaskSchedulerService,
  ],
})
export class TaskQueueModule {}
