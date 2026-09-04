export class BaseResponseDto<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string = new Date().toISOString();
}
