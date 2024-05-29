import { Module } from '@nestjs/common';
import { FlywireService } from './flywire.service';
import { FlywireController } from './flywire.controller';
import { UtilsService } from 'src/utils/utils.service';
import { UtilsModule } from 'src/utils/utils.module';

@Module({
  imports: [UtilsModule],
  providers: [FlywireService, UtilsService],
  controllers: [FlywireController],
})
export class FlywireModule {}
