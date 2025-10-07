// src/common/filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CustomLogger } from 'src/logger/custom-logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {

  constructor(private readonly logger: CustomLogger) { }
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : (res as any).message || message;
    }

    // Log the exception using CustomLogger
    this.logger.error(
      `HTTP ${status} Error on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : undefined
    );

    response.status(status).json({
      // data: null,
      message: Array.isArray(message) ? message[0] : message,
      success: false
    });
  }
}
