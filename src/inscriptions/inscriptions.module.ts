import { Module } from '@nestjs/common';
import { InscriptionsController } from './inscriptions.controller';
import { InscriptionsService } from './inscriptions.service';

@Module({
  controllers: [InscriptionsController],
  providers: [InscriptionsService]
})
export class InscriptionsModule {}
