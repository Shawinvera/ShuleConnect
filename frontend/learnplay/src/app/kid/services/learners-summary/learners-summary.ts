import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Interface for the individual subject items in the summary
export interface SubjectSummary {
  id: string;
  name: string;
  topicCount: number;
  subTopicCount: number;
  lessonCount: number;
  lessonCompletedCount: number;
  percentageCompleted: number;
  points: number; 
}

// Interface for the main summary object
export interface LearnerLessonSummary {
  learnerId: string;
  lessonCount: number;
  streak: number;
  lessonCompletedCount: number;
  percentageCompleted: number;
  points?: number; // Total points across all subjects
  subjects: SubjectSummary[];
}

@Injectable({
  providedIn: 'root',
})
export class LearnersSummary {
  // Base endpoint pointing to /learner
  private readonly endpoint = `${environment.apiUrl}/learner`;

  constructor(private http: HttpClient) {}

  /**
   * Fetches the lesson summary (progress, streaks, subjects) for a specific learner.
   * Path: /wazi/learner/fetchLessonSummary/{learnerId}
   */
  public getLearnerLessonSummary(learnerId: string): Observable<LearnerLessonSummary> {
    return this.http.get<LearnerLessonSummary>(`${this.endpoint}/fetchLessonSummary/${learnerId}`);
  }
}