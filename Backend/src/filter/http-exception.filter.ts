import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus ? exception.getStatus() : 500;
    const method = request.method;
    const url = request.url;
    const now = Date.now();
    let message = exception.message;
    let responseMessage: any = null;
    if (exception.getResponse) {
      responseMessage = exception.getResponse();
    }
    if (responseMessage && responseMessage['message']) {
      message = responseMessage['message'];
    }

    let coloredStatusCode: string = status.toString();
    // if (status >= 400 && status < 500) {
    //     coloredStatusCode = chalk.yellow(status);
    // } else if (status >= 500) {
    //     coloredStatusCode = chalk.red(status);
    // } else {
    //     coloredStatusCode = chalk.green(status);
    // }

    const logMessage = `Outgoing response: ${method} ${url} - ${coloredStatusCode} - ${Date.now() - now}ms - [ Message: ${message} ]`;
    if (status >= 400 && status < 500) {
      this.logger.warn(logMessage);
    } else if (status >= 500) {
      this.logger.error(logMessage);
    } else {
      this.logger.log(logMessage);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}
