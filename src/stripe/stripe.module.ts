import { Module } from '@nestjs/common';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { UtilsService } from 'src/utils/utils.service';

@Module({
  controllers: [StripeController],
  providers: [StripeService, UtilsService]
})
export class StripeModule {}
