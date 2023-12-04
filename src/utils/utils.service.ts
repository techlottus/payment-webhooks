import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
require('dotenv').config();
import { env } from 'process';

@Injectable()
export class UtilsService {
  constructor(private readonly http: HttpService) {}

  postStrapi (endpoint: string, data: any) {
    const request = { data }
    console.log(request);
    
    return this.http.post(`${env.STRAPI_TRACKING_API}/${endpoint}`, request, { headers: { Authorization: `Bearer ${env.STRAPI_TRACKING_TOKEN}` }})
  }

}
