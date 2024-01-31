import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { env } from 'process';
import { config } from "dotenv";
config()
@Injectable()
export class EnrollmentService {
  constructor(private http: HttpService) {}

  checkUser(email: string) {
    const wsfunction = 'core_user_get_users_by_field'
    const req = {
      field: 'email',
      'values[0]': email,
      wsfunction
    }
    return this.callEnrollmentService(req)

  }
  UserCreate(email: string, first_name: string, last_name: string ) {
    const wsfunction = 'core_user_create_users'
    const req = {
      'users[0][username]': email,
      'users[0][firstname]': first_name,
      'users[0][lastname]': last_name,
      'users[0][email]': email,
      'users[0][createpassword]': 1,
      wsfunction
    }

    return this.callEnrollmentService(req)


  }
  getProgram(shortname) {
    const wsfunction = 'core_course_get_courses_by_field'
    const req = {
      field: 'shortname',
      value: shortname,
      wsfunction
    }
    return this.callEnrollmentService(req)

  }
  enrollStudent(user: number, course: number) {
    const wsfunction = 'enrol_manual_enrol_users'
    const req = {
      'enrolments[0][roleid]': 5, // 5: student roleId moodle
      'enrolments[0][userid]': user,
      'enrolments[0][courseid]': course,
      wsfunction
    }
    return this.callEnrollmentService(req)

  }
  callEnrollmentService(req) {    
    return this.http.post(env.ENROLLMENT_URL, {...req, wstoken: env.ENROLLMENT_TOKEN,  moodlewsrestformat: 'json'}, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    })
  }
}
