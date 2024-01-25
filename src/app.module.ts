import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StripeModule } from './stripe/stripe.module';
import { InscriptionsModule } from './inscriptions/inscriptions.module';
import { RouterModule } from '@nestjs/core';
import { UtilsModule } from './utils/utils.module';
import { SalesforceModule } from './salesforce/salesforce.module';
import { EnrollmentModule } from './enrollment/enrollment.module';

@Module({
  imports: [
    StripeModule,
    InscriptionsModule,
    SalesforceModule,
    RouterModule.register([
      {
        path: '/',
        module: StripeModule,
      },
      {
        path: '/',
        module: InscriptionsModule,
      },
      {
        path: '/',
        module: SalesforceModule,
      },
    ]),
    UtilsModule,
    EnrollmentModule,
    
  ],
  controllers: [ AppController ],
  providers: [ AppService ],
})
export class AppModule {}
