import { HttpException } from '@nestjs/common'

export class BusinessException extends HttpException {
  public readonly businessCode: number

  constructor(code: number, message: string) {
    super({ code, message, success: false }, 200)
    this.businessCode = code
  }
}
