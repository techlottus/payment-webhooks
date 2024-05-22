import { Controller, Post, Req, Res } from '@nestjs/common';
import { CurpService } from './curp.service';
import { catchError, of } from 'rxjs';

@Controller('curp')
export class CurpController {
    constructor(private readonly curpService: CurpService) { }

    @Post('/validate')
    webhook(@Req() request: any, @Res() response: any) {
        console.log('request.body: ', request.body);
        
        const ParamsHasError = !request.body.curp
        const ParamsError = `Missing parameters: ${request.body.curp ? '' : 'curp, please check call.'}`
        if (ParamsHasError) return response.status(400).send(ParamsError)
        console.log('request.body.curp: ', request.body.curp);
        // const curp = this.curpService.validateCURP(request.body.curp)
        // if (curp) {
        this.curpService.fetchCURP(request.body.curp).pipe(
            catchError((err, caught) => {
                console.log('err.response: ', err.response);
                console.log('err.response.data: ', err.response.data);
                
                return of({error: true, ...err})
            })
        ).subscribe(res => {
            if (res.error) {
                return response.status(res.response.data.status).send(res.response.data.message)
            }
            if (res.data) {
                return response.status(200).send({ ...res.data })
            }
        })
        // } else {
        //     return response.status(400).send("CURP is invalid, please check params")
        // }
    }
}