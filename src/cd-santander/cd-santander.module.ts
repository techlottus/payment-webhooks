import { Module } from '@nestjs/common';
import { CdSantanderService } from './cd-santander.service';
import { CdSantanderController } from './cd-santander.controller';
import { UtilsModule } from 'src/utils/utils.module';

@Module({
  imports: [UtilsModule],
  providers: [CdSantanderService],
  controllers: [CdSantanderController]
})
export class CdSantanderModule {}
