import { Controller, Post, Req, Res } from '@nestjs/common';
import { CurpService } from './curp.service';
import { catchError } from 'rxjs';

@Controller('curp')
export class CurpController {
    constructor(private readonly curpService: CurpService) { }

    @Post('/validate')
    webhook(@Req() request: any, @Res() response: any) {
        const ParamsHasError = !request.body.curp
        const ParamsError = `Missing parameters: ${request.body.curp ? '' : 'curp, please check call.'}`
        if (ParamsHasError) return response.status(400).send(ParamsError)
        const curp = this.curpService.validateCURP(request.body.curp)
        if (curp) {
            this.curpService.fetchCURP(curp).pipe(
                catchError((err, caught) => {
                    response.status(err.response.data.status).send(err.response.data.message)
                    return caught
                })
            ).subscribe(res => {
                return response.status(200).send({ ...res.data })
            })
        } else {
            return response.status(400).send("CURP is invalid, please check params")
        }
    }
}