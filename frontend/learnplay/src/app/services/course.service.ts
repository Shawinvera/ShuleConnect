import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CourseService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createCourse(courseData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/courses`, courseData, { 
      withCredentials: true 
    });
  }

  getAllCourses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/courses/all`, { 
      withCredentials: true 
    });
  }

  getCourseById(courseId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/courses/byId/${courseId}`, { 
      withCredentials: true 
    });
  }

  getCoursesByCountry(countryCode: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/courses/fetchByCountryCode?countryCode=${countryCode}&status=1`, { 
      withCredentials: true 
    });
  }

  updateCourse(courseId: string, courseData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/courses/update`, courseData, {
      withCredentials: true
    });
  }
}