import { Module } from '@nestjs/common';
import { InscriptionsController } from './inscriptions.controller';
import { InscriptionsService } from './inscriptions.service';
import { UtilsService } from 'src/utils/utils.service';
import { UtilsModule } from 'src/utils/utils.module';
import { StripeService } from 'src/stripe/stripe.service';
import { StripeModule } from 'src/stripe/stripe.module';

@Module({
  imports: [ UtilsModule, StripeModule ],
  controllers: [ InscriptionsController ],
  providers: [ InscriptionsService, UtilsService, StripeService ]
})
export class InscriptionsModule {}
