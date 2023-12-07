import { Module } from '@nestjs/common';
import { SalesforceService } from './salesforce.service';
import { SalesforceController } from './salesforce.controller';
import { UtilsModule } from 'src/utils/utils.module';

@Module({
  imports: [UtilsModule],
  providers: [SalesforceService],
  controllers: [SalesforceController]
})
export class SalesforceModule {}
