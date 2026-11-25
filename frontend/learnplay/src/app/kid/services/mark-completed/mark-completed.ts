import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// This matches your Java LessonTrackerDto
export interface LessonTrackerDto {
  learnerId: string;
  lessonId: string;
  id?: string;
  completedAt?: string;
  points?: number;
  airtimeRewardQueued?: boolean;
  alreadyCompleted?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MarkCompletedService {
  private readonly endpoint = `${environment.apiUrl}/lesson`;

  constructor(private http: HttpClient) {}

  public markAsComplete(payload: LessonTrackerDto): Observable<LessonTrackerDto> {
    return this.http.post<LessonTrackerDto>(`${this.endpoint}/markComplete`, payload);
  }
}