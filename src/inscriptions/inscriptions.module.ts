import { Module } from '@nestjs/common';
import { InscriptionsController } from './inscriptions.controller';
import { InscriptionsService } from './inscriptions.service';
import { HttpModule } from '@nestjs/axios';
import { UtilsService } from 'src/utils/utils.service';

@Module({
  imports: [HttpModule],
  controllers: [InscriptionsController],
  providers: [InscriptionsService, UtilsService]
})
export class InscriptionsModule {}
