import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import chalk from 'chalk';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    this.logger.log(chalk.white(`Incoming request: ${method} ${url}`));

    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;
        const logMessage = `Outgoing response: ${method} ${url} - ${statusCode} - ${Date.now() - now}ms`;

        if (statusCode >= 400 && statusCode < 500) {
          this.logger.warn(chalk.yellow(logMessage));
        } else if (statusCode >= 500) {
          this.logger.error(chalk.red(logMessage));
        } else {
          this.logger.log(chalk.green(logMessage));
        }
      }),
    );
  }
}
