import { Module } from '@nestjs/common';
import { InscriptionsController } from './inscriptions.controller';
import { InscriptionsService } from './inscriptions.service';
import { UtilsService } from 'src/utils/utils.service';
import { UtilsModule } from 'src/utils/utils.module';

@Module({
  imports: [ UtilsModule ],
  controllers: [ InscriptionsController ],
  providers: [ InscriptionsService, UtilsService ]
})
export class InscriptionsModule {}
