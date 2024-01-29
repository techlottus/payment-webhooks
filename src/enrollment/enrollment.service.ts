import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { env } from 'process';
import { config } from "dotenv";
config()
@Injectable()
export class EnrollmentService {
  constructor(private http: HttpService) {}

  checkUser(email: string) {
    // test data 'values[0]': 'juan.figueroa2@lottuseducation.com'
    const wsfunction = 'core_user_get_users_by_field'
    const req = {
      field: 'username',
      'values[0]': email,
      wsfunction
    }
    return this.callEnrollmentService(req)

  }
  UserCreate(email: string, first_name: string, last_name: string ) {
    // test data 'users[0][username]': 'juan.figueroa2@lottuseducation.com'
    // test data 'users[0][firstname]': 'Juan Alberto'
    // test data 'users[0][lastname]': 'Figueroa Sierra'
    // test data 'users[0][email]': 'juan.figueroa2@lottuseducation.com'
    // test data 'users[0][password]': 'Welcome2024*',
    const wsfunction = 'core_user_create_users'
    const req = {
      'users[0][username]': email,
      'users[0][firstname]': first_name,
      'users[0][lastname]': last_name,
      'users[0][email]': email,
      'users[0][password]': 'Welcome2024*',
      wsfunction
    }

    // returns id, username
    return this.callEnrollmentService(req)


  }
  getProgram(shortname) {
    const wsfunction = 'core_course_get_courses_by_field'
    // test data value: BESAE101-2086202147
    const req = {
      field: 'shortname',
      value: shortname,
      wsfunction
    }
    // returns [ programid, ...rest]
    return this.callEnrollmentService(req)

  }
  enrollStudent(user: number, course: number) {
    // test data value: 'enrolments[0][roleid]': 5
    // test data value: 'enrolments[0][userid]': 13136
    // test data value: 'enrolments[0][courseid]': 6410
    const wsfunction = 'enrol_manual_enrol_users'
    console.log(user);
    console.log(course);
    
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
