import { Module } from '@nestjs/common';
import { SalesforceService } from './salesforce.service';
import { SalesforceController } from './salesforce.controller';

@Module({
  providers: [SalesforceService],
  controllers: [SalesforceController]
})
export class SalesforceModule {}
