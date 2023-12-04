import { Module } from '@nestjs/common';
import { UtilsService } from './utils.service';
import { HttpModule, HttpService } from '@nestjs/axios';

@Module({
  imports:[HttpModule],
  providers: [UtilsService, HttpService]
})
export class UtilsModule {}
