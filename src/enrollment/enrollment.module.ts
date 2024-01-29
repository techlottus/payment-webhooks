import { Module } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { UtilsModule } from 'src/utils/utils.module';

@Module({
  imports: [ UtilsModule ],
  controllers: [EnrollmentController],
  providers: [EnrollmentService]
})
export class EnrollmentModule {}
