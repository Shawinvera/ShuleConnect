import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface LessonHistoryItem {
  id: string;
  learnerId: string;
  lessonId: string;
  completedAt: string;
  lessonName: string;
  subjectName: string;
  points: number;
}

@Injectable({
  providedIn: 'root',
})
export class LearningHistory {
  private readonly endpoint = `${environment.apiUrl}/learner`;

  constructor(private http: HttpClient) {}

  /**
   * Fetches the recent activity for a specific learner.
   * Path: /learner/history/{learnerId}
   */
  public getHistory(learnerId: string): Observable<LessonHistoryItem[]> {
    return this.http.get<LessonHistoryItem[]>(`${this.endpoint}/history/${learnerId}`);
  }
}
