import { Module } from '@nestjs/common';
import { UtilsService } from './utils.service';
import { HttpService } from '@nestjs/axios';

@Module({
  imports:[HttpService],
  providers: [UtilsService]
})
export class UtilsModule {}
