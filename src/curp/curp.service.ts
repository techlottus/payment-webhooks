import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios';
import { env } from 'process';

@Injectable()
export class CurpService {
    constructor(private http: HttpService) { }

    validateCURP(curp: string) {
        const validatorCURP = /^([A-Z][AEIOUX][A-Z]{2}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[HM](?:AS|B[CS]|C[CLMSH]|D[FG]|G[TR]|HG|JC|M[CNS]|N[ETL]|OC|PL|Q[TR]|S[PLR]|T[CSL]|VZ|YN|ZS)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d])(\d)$/
        return validatorCURP.test(curp) ? curp : null
    }

    fetchCURP(curp: string) {
        const data = {
            idEndPoint: env.CURP_VALIDATION_ID_END_POINT,
            params: [{                
                "name": "curp",
                "value": curp
            }]
        };
        return this.http.post(env.CURP_VALIDATION_URL, data, {
            headers: {
                'PublicApiKey': env.CURP_VALIDATION_API_KEY
            }
        })
    }
}
