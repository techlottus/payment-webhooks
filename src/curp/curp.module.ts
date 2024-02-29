import { Module } from '@nestjs/common';
import { CurpController } from './curp.controller';
import { CurpService } from './curp.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports:[ HttpModule ],
  controllers: [CurpController],
  providers: [CurpService]
})
export class CurpModule {}
