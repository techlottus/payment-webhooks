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
  GetInfo = async(access_token) => {
    return new Promise(async function(resolve, reject) {
        setTimeout(async () => {
            try {
                let response = null;
                let microsoft;

                try {
                    microsoft = await axios.get(`https://graph.microsoft.com/v1.0/me`, {
                        headers: {
                            'Authorization': `${access_token}`
                        }
                    });

                    if (microsoft.status === 200) {
                        const data = microsoft.data;

                        if (data.mail) {
                            response = {
                                email: data.mail,
                                hd: ''
                            }
                        }
                    }
                } catch (microsoftError) {
                    if (microsoftError.response && microsoftError.response.status === 401) {
                        let google = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);

                        response = {
                            email: google.data.email,
                            hd: google.data.hd,
                        };
                    } else {
                        reject(microsoftError.response ? microsoftError.response.status : microsoftError.message);
                    }
                }
                resolve(response);

            } catch (err) {
                const estatus = err.response ? err.response.status : err.message;
                reject(estatus);
            }
        }, 500);
    });
}

SantanderLottus = (email) => {
    return this.http.get(`https://r3v3cydwpg.execute-api.us-east-1.amazonaws.com/prod/getEventCDULA?email=${email}`, {
        headers: {
            authorizationToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZWNyZXQiOiImSTJSQzs1ZWchayNZVT4_dT1IayJ9.7tbGNxyit59rfC9SLHLBOnZziSmmXzAbvEXnXVDgVsI'
        }
    })
}
}
