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
import { MockBill } from './bill/entities/mock-bill.entity';
import { BillController } from './bill/controller/bill.controller';
import { BillService } from './bill/service/bill.service';
import { BbpsAdapter } from './payment/adapter/bbps.adapter';
import { MockBbpsAdapter } from './payment/adapter/mock-bbps.adapter';
import { DemoBbpsData } from './demo/entities/demo-bbps-data.entity';
import { DemoBbpsDataSeeder } from './demo/demo-bbps-data.seeder';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      BillerRegistration,
      BillPayment,
      BillSchedule,
      MockBill,
      DemoBbpsData,
    ]),
  ],
  controllers: [
  BillerController,
  PaymentController,
  BillController,
],
  providers: [
  BillerService,
  PaymentService,
  BillScheduleService,
  BillService,
  DemoBbpsDataSeeder,
 MockBbpsAdapter,
  {
    provide: 'BBPS_ADAPTER',
    useExisting: MockBbpsAdapter,
  },
],
  exports: [PaymentService],
})
export class BillPaymentModule {}
