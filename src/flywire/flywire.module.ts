import { Module } from '@nestjs/common';
import { FlywireService } from './flywire.service';
import { FlywireController } from './flywire.controller';

@Module({
  providers: [FlywireService],
  controllers: [FlywireController]
})
export class FlywireModule {}
