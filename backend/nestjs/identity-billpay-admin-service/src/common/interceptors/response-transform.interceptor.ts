import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseResponseDto } from '../dto/base-response.dto';

// Registered globally in main.ts (after LoggingInterceptor, so the log line above reflects
// exactly what the client receives). Only wraps success responses — thrown exceptions skip
// interceptors entirely and are shaped separately by HttpExceptionFilter.
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<BaseResponseDto> {
    return next.handle().pipe(
      map((data) => {
        const response = new BaseResponseDto();
        response.success = true;
        response.data = data;
        return response;
      }),
    );
  }
}
