import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable, map } from 'rxjs'
import { Result } from '../result.js'
import { BusinessException } from '../exceptions/business.exception.js'

interface UnifiedSuccessResponse<T = unknown> {
  success: true
  code: 200
  message: 'ok'
  data: T
  timestamp: string
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((value) => {
        if (value instanceof Result) {
          if (value.isSuccess) {
            return this.wrapSuccess(value.data)
          }
          throw new BusinessException(value.error.code, value.error.message)
        }
        return this.wrapSuccess(value)
      }),
    )
  }

  private wrapSuccess<T>(data: T): UnifiedSuccessResponse<T> {
    return {
      success: true,
      code: 200,
      message: 'ok',
      data,
      timestamp: new Date().toISOString(),
    }
  }
}
