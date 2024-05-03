import { Controller, Get, Req, Res } from '@nestjs/common';
import { CdSantanderService } from './cd-santander.service';
import { catchError, concatMap, take } from 'rxjs';

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

        // const token = authHeader.split(' ')[1];
        this.CDSantanderService.me(authHeader).pipe(
          concatMap(res => this.CDSantanderService.SantanderLottus(res.data.mail)),
          catchError((err, caught) => {
            console.log(err.response.data);
            response.status(400).send(err.response.data)

            return caught
          })
         )
         .subscribe(res => {
          console.log(res);
          console.log(res.data.mail);
          // if (!res.error) {
            
          // }
          // this.CDSantanderService.SantanderLottus(res.data.mail).pipe(
          //   catchError((err, caught) => {
          //     console.log(err);
          //     response.status(400).send(err.response.data)
              
          //     return caught
          //   })
          // ).subscribe(res => {
          //   console.log(res);
          //   // console.log(res.data.Data);

            
          // });
          response.status(res.status).send(res.data.Data)
        });
  }
}
