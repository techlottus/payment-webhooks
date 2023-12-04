import { Module } from '@nestjs/common';
import { UtilsService } from './utils.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports:[HttpModule]
})
export class UtilsModule {}
