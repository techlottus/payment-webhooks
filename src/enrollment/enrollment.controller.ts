
import { Controller, Post, Req, Res } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';

@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentsService: EnrollmentService) {}

  @Post('/new')
  webhook(@Req() request: Request, @Res() response: any ) {
    console.log("request: ", request);
    // request.cs_id
    // request.email
    // this.inscriptionsService.populateStrapi(request, response)
  }
}
