import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { InternalEventBusService } from './internal-event-bus.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [],
  providers: [InternalEventBusService],
  exports: [InternalEventBusService],
})
export class InternalEventBusModule {}
