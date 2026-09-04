import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Thin wrapper around @nestjs/event-emitter. In-process only — not a
// message broker. Cross-service events go through the audit outbox instead.
@Injectable()
export class InternalEventBusService {
  constructor(private readonly emitter: EventEmitter2) {}

  publish(eventName: string, payload: unknown): void {
    this.emitter.emit(eventName, payload);
  }

  on(eventName: string, handler: (payload: unknown) => void): void {
    this.emitter.on(eventName, handler);
  }
}
