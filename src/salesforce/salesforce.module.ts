import { Module } from '@nestjs/common';
import { SalesforceService } from './salesforce.service';
import { SalesforceController } from './salesforce.controller';
import { UtilsModule } from 'src/utils/utils.module';
import { UtilsService } from 'src/utils/utils.service';

@Module({
  imports: [UtilsModule],
  providers: [SalesforceService, UtilsService],
  controllers: [SalesforceController]
})
export class SalesforceModule {}
