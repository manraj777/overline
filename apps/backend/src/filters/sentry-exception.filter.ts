import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      message =
        typeof exResponse === 'string' ? exResponse : (exResponse as any)?.message || message;
    }

    // Report to Sentry if configured
    try {
      const Sentry = require('@sentry/node');
      if (Sentry?.isInitialized?.()) {
        Sentry.withScope((scope: any) => {
          scope.setExtra('url', request.url);
          scope.setExtra('method', request.method);
          scope.setExtra('statusCode', status);
          if ((request as any).user) {
            scope.setUser({ id: (request as any).user.id });
          }
          Sentry.captureException(exception);
        });
      }
    } catch {
      // Sentry not available — that's fine
    }

    // Log non-HTTP errors
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
