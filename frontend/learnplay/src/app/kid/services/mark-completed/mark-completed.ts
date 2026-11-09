import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// This matches your Java LessonTrackerDto
export interface LessonTrackerDto {
  learnerId: string;
  lessonId: string;
}

@Injectable({
  providedIn: 'root',
})
export class MarkCompletedService {
  private readonly endpoint = `${environment.apiUrl}/lesson`;

  constructor(private http: HttpClient) {}

  public markAsComplete(payload: LessonTrackerDto): Observable<any> {
    return this.http.post<any>(`${this.endpoint}/markComplete`, payload);
  }
}