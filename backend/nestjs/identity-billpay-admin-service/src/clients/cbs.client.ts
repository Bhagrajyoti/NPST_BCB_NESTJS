import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// Core Banking System client, wrapped via the resilience factory.
@Injectable()
export class CbsClient {
  constructor(private readonly httpService: HttpService) {}

  async get<T>(url: string): Promise<T> {
    const response = await firstValueFrom(this.httpService.get<T>(url));
    return response.data;
  }

  async post<T>(url: string, body: unknown): Promise<T> {
    const response = await firstValueFrom(this.httpService.post<T>(url, body));
    return response.data;
  }
}
