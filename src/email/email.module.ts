import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { UtilsService } from 'src/utils/utils.service';
import { HttpModule } from '@nestjs/axios';
import { ErrorManagerService } from 'src/error-manager/error-manager.service';
import { ErrorManagerModule } from 'src/error-manager/error-manager.module';

@Module({
  imports: [HttpModule, ErrorManagerModule],
  providers: [EmailService, UtilsService, ErrorManagerService],
  controllers: [EmailController]
})
export class EmailModule {}
