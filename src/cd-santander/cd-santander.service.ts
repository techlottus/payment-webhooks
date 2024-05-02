import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { env } from 'process';
import { of } from 'rxjs';

@Injectable()
export class CdSantanderService {

    constructor(private http: HttpService) {}
    me(token: string) {
       return this.http.get('https://graph.microsoft.com/v1.0/me',{ headers: { 'Authorization': token}})
    }
    SantanderLottus = (email) => {
        return this.http.get(`${env.CD_SANTANDER_URL}${email}`, {
            headers: {
                authorizationToken: env.CD_SANTANDER_TOKEN
            }
        })
    }
}
