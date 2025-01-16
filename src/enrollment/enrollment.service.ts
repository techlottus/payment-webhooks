import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { env } from 'process';
import { config } from "dotenv";
config()

const brands = {
  ULA: {
    url: env.ENROLLMENT_URL_ULA,
    token: env.ENROLLMENT_TOKEN_ULA
  },
  UANE: {
    url: env.ENROLLMENT_URL_UANE,
    token: env.ENROLLMENT_TOKEN_UANE
  },
  UTEG: {
    url: env.ENROLLMENT_URL_UTEG,
    token: env.ENROLLMENT_TOKEN_UTEG
  },
  UTC: {
    url: env.ENROLLMENT_URL_UTC,
    token: env.ENROLLMENT_TOKEN_UTC
  },
  BEDU: {
    url: env.ENROLLMENT_URL_BEDU,
    token: env.ENROLLMENT_TOKEN_BEDU
  },
}
@Injectable()
export class EnrollmentService {
  constructor(private http: HttpService) {}

  checkUser(email: string, provider: string) {
    const wsfunction = 'core_user_get_users_by_field'
    const req = {
      field: 'email',
      'values[0]': email,
      wsfunction
    }
    return this.callEnrollmentService(req, provider)

  }
  UserCreate(email: string, first_name: string, last_name: string, password:string, provider: string) {
    const wsfunction = 'core_user_create_users'
    const req = {
      'users[0][username]': email.toLowerCase(),
      'users[0][firstname]': first_name,
      'users[0][lastname]': last_name,
      'users[0][email]': email,
      'users[0][password]': password,
      'users[0][institution]': 'EXTENSION',
      wsfunction
    }

    return this.callEnrollmentService(req, provider)


  }
  getProgram(shortname: string, provider: string) {
    const wsfunction = 'core_course_get_courses_by_field'
    const req = {
      field: 'shortname',
      value: shortname,
      wsfunction
    }
    return this.callEnrollmentService(req, provider)

  }
  enrollStudent(user: number, course: number, provider: string, time_end?: string) {
    const wsfunction = 'enrol_manual_enrol_users'
    const req = {
      'enrolments[0][roleid]': 5, // 5: student roleId moodle
      'enrolments[0][userid]': user,
      'enrolments[0][courseid]': course,
      wsfunction
    }
    if (time_end) {
      req['enrolments[0][timeend]'] = time_end
    }
    return this.callEnrollmentService(req, provider)

  }
  callEnrollmentService(req, provider:string) {
    console.log('req: ', req);

    
    const url = provider && brands[provider] ? brands[provider].url : env.ENROLLMENT_URL
    const token = provider && brands[provider] ? brands[provider].token : env.ENROLLMENT_TOKEN

    return this.http.post(url, {...req, wstoken: token,  moodlewsrestformat: 'json'}, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    })
  }
}
