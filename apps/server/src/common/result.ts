export interface ResultError {
  code: number
  message: string
}

export class Result<T = unknown> {
  private readonly _isSuccess: boolean
  private readonly _data?: T
  private readonly _error?: ResultError

  private constructor(isSuccess: boolean, data?: T, error?: ResultError) {
    this._isSuccess = isSuccess
    this._data = data
    this._error = error
  }

  /** 创建成功结果 */
  static success<T>(data: T): Result<T> {
    return new Result<T>(true, data)
  }

  /** 创建失败结果 */
  static fail(code: number, message: string): Result<never> {
    return new Result<never>(false, undefined, { code, message })
  }

  /** 类型守卫：是否为成功结果 */
  get isSuccess(): boolean {
    return this._isSuccess
  }

  /** 类型守卫：是否为失败结果 */
  get isFailure(): boolean {
    return !this._isSuccess
  }

  /** 获取成功数据（仅在 isSuccess 为 true 时有效） */
  get data(): T {
    if (!this._isSuccess) {
      throw new Error('Cannot get data from a failed Result')
    }
    return this._data as T
  }

  /** 获取错误信息（仅在 isSuccess 为 false 时有效） */
  get error(): ResultError {
    if (this._isSuccess) {
      throw new Error('Cannot get error from a successful Result')
    }
    return this._error as ResultError
  }
}
