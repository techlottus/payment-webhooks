import { Module } from '@nestjs/common';
import { CurpController } from './curp.controller';
import { CurpService } from './curp.service';
import { CurpController } from './curp.controller';

@Module({
  controllers: [CurpController],
  providers: [CurpService]
})
export class CurpModule {}
