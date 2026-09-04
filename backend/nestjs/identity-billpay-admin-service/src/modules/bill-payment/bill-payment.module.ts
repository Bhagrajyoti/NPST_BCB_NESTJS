import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillerController } from './biller/biller.controller';
import { BillerService } from './biller/biller.service';
import { BillerRegistration } from './biller/entities/biller-registration.entity';
import { PaymentController } from './payment/payment.controller';
import { PaymentService } from './payment/payment.service';
import { BillPayment } from './payment/entities/bill-payment.entity';
import { BillScheduleService } from './scheduling/bill-schedule.service';
import { BillSchedule } from './scheduling/entities/bill-schedule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BillerRegistration, BillPayment, BillSchedule])],
  controllers: [BillerController, PaymentController],
  providers: [BillerService, PaymentService, BillScheduleService],
  exports: [PaymentService],
})
export class BillPaymentModule {}
