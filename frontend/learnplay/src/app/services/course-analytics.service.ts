import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CourseAnalytics {
  totalEnrolledUsers: number;
  totalLearners: number;
  activeSubscribers: number;
  activeSubscriptionRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class CourseAnalyticsService {
  
  constructor(private http: HttpClient) {}

  getCourseAnalytics(courseId: string): Observable<CourseAnalytics> {
    return this.http.get<CourseAnalytics>(`${environment.apiUrl}/courses/analytics/${courseId}`);
  }
}