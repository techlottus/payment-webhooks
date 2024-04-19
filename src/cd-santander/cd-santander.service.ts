import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { of } from 'rxjs';

@Injectable()
export class CdSantanderService {

    constructor(private http: HttpService) {}
    me(token: string) {
       return this.http.get('https://graph.microsoft.com/v1.0/me',{ headers: { 'Authorization': token}})
    }
    SantanderLottus = (email) => {
        return this.http.get(`https://r3v3cydwpg.execute-api.us-east-1.amazonaws.com/prod/getEventCDULA?email=${email}`, {
            headers: {
                authorizationToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZWNyZXQiOiImSTJSQzs1ZWchayNZVT4_dT1IayJ9.7tbGNxyit59rfC9SLHLBOnZziSmmXzAbvEXnXVDgVsI'
            }
        })
    }
}
