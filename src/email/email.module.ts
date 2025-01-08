import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { UtilsService } from 'src/utils/utils.service';
import { HttpModule } from '@nestjs/axios';
import { ErrorManagerService } from 'src/utils/error-manager.service';
import { UtilsModule } from 'src/utils/utils.module';

@Module({
  imports: [HttpModule, UtilsModule],
  providers: [EmailService, UtilsService, ErrorManagerService],
  controllers: [EmailController]
})
export class EmailModule {}
