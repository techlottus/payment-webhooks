import { Module } from '@nestjs/common';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { UtilsService } from 'src/utils/utils.service';
import { UtilsModule } from 'src/utils/utils.module';
import { ErrorManagerService } from 'src/utils/error-manager.service';

@Module({
  imports: [ UtilsModule ],
  controllers: [ StripeController ],
  providers: [ StripeService, UtilsService, ErrorManagerService ]
})
export class StripeModule {}
