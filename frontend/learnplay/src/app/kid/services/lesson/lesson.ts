import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface LessonSummary {
  id: string;
  name: string;
  content: string;
  videoUrl: string;
  duration: number;
  subTopicId: string;
  orderIndex: number;
  subTopicOrderIndex: number; 
  topicOrderIndex: number;
  thumbnailUrl?: string;
  learnerCompleted: boolean;
  active: boolean;
  trailer: boolean;
  locked?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class LessonService {
  private readonly endpoint = `${environment.apiUrl}/lesson`;

  constructor(private http: HttpClient) {}

  public getLessonsBySubTopicId(subTopicId: string, learnerId?: string): Observable<LessonSummary[]> {
    const url = learnerId
      ? `${this.endpoint}/fetch/bySubTopicId/${subTopicId}?learnerId=${learnerId}`
      : `${this.endpoint}/fetch/bySubTopicId/${subTopicId}`;
    return this.http.get<LessonSummary[]>(url);
  }

  public getLessonsByGradeSubject(gsId: string, learnerId: string): Observable<LessonSummary[]> {
  // Path: /wazi/lesson/byGradeSubject?gradeSubjectId=...&learnerId=...
  return this.http.get<LessonSummary[]>(
    `${this.endpoint}/byGradeSubject?gradeSubjectId=${gsId}&learnerId=${learnerId}`
  );
}
}