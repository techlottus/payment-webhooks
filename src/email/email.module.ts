import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { UtilsService } from 'src/utils/utils.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [EmailService, UtilsService],
  controllers: [EmailController]
})
export class EmailModule {}
