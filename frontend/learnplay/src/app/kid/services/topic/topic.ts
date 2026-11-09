// topic.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// This matches your TopicSummaryDto from Java
export interface TopicSummary {
  id: string;
  name: string;
  description: string;
  active: boolean;
  subTopicCount: number;
  orderIndex: number;
}

@Injectable({
  providedIn: 'root',
})
export class TopicService {
  private readonly endpoint = `${environment.apiUrl}/grade-subject`;

  constructor(private http: HttpClient) {}

  // Calls the endpoint: /wazi/grade-subject/topics/bySubject/{gradeSubjectId}
  getTopicsByGradeSubject(gsId: string): Observable<TopicSummary[]> {
    return this.http.get<TopicSummary[]>(`${this.endpoint }/topics/bySubject/${gsId}`);
  }
}
