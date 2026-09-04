import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationTemplateHistory } from './entities/notification-template-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationTemplate, NotificationTemplateHistory])],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
