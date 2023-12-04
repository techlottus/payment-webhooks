import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
require('dotenv').config();
import { env } from 'process';
@Injectable()
export class AppService {
  constructor(private readonly http: HttpService) {}
  
  getHello(): string {
    return 'Hello World!';
  }
  async postStrapi (endpoint: string, data: any) {
    return this.http.post(`${env.STRAPI_TRACKING_API}/${endpoint}`, { data }, { headers: { Authorization: `Bearer ${env.STRAPI_TRACKING_TOKEN}` }})
  }
}
