import { Module } from '@nestjs/common';
import { UtilsService } from './utils.service';
import { HttpModule } from '@nestjs/axios';
import { ErrorManagerService } from './error-manager.service';

@Module({
  imports:[ HttpModule ],
  providers: [ UtilsService, ErrorManagerService ],
  exports: [ UtilsService, HttpModule, ErrorManagerService ]
})
export class UtilsModule {}
