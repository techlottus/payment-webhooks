import { Controller, Get, Req, Res } from '@nestjs/common';
import { CdSantanderService } from './cd-santander.service';
import { catchError, concatMap, of, take } from 'rxjs';

@Controller('cd-santander')
export class CdSantanderController {
  constructor(private CDSantanderService: CdSantanderService) {}

 @Get('/credentials')
  async webhook(@Req() request: any, @Res() response: any ) {
    const authHeader = request.headers.authorization;
    console.log(authHeader);

    if(!authHeader){
        response.status(401).send();
    }
    this.CDSantanderService.me(authHeader).pipe(
      concatMap(res => {
        console.log(res);
        
        return res.data.mail
        ? this.CDSantanderService.SantanderLottus(res.data.mail)
        : of(res)
      }),
      catchError((err, caught) => {
        return of(err.response)
      })
      )
      .subscribe(res => {
        console.log(res);
        
        if (res.data.error) {
          return response.status(res.status).send(res.data)
        } else {
          return response.status(res.status).send(res.data.Data)
        }
      });
  }
}
