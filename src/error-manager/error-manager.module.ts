import { Module } from '@nestjs/common';
import { ErrorManagerService } from './error-manager.service';
import { UtilsService } from 'src/utils/utils.service';
import { UtilsModule } from 'src/utils/utils.module';

@Module({
  imports: [UtilsModule],
  providers: [ErrorManagerService, UtilsService]
})
export class ErrorManagerModule {}
