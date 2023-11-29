import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StripeModule } from './stripe/stripe.module';
import { InscriptionsModule } from './inscriptions/inscriptions.module';
import { RouterModule } from '@nestjs/core';

@Module({
  imports: [
    StripeModule,
    InscriptionsModule,
    RouterModule.register([
      {
        path: '/',
        module: StripeModule,
      },
      {
        path: '/',
        module: InscriptionsModule,
      },
    ])
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
