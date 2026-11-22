import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LessonQuizLessonOption {
  id: string;
  lessonName: string;
  subjectName: string;
  topicName: string;
  subTopicName: string;
}

export interface LessonQuizSummary {
  id: string;
  title: string;
  lessonId: string;
  lessonName: string;
  questionCount: number;
}

export interface LessonQuizQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface LessonQuiz {
  id: string;
  title: string;
  lessonId: string;
  questions: LessonQuizQuestion[];
  attemptCount: number;
  latestScore: number | null;
  latestPercentage: number | null;
}

export interface LessonQuizResult {
  score: number;
  questionCount: number;
  percentage: number;
  passed: boolean;
  attemptCount: number;
}

export interface LessonQuizQuestionDraft {
  prompt: string;
  options: string[];
  correctOptionIndex: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class LessonQuizService {
  private readonly endpoint = `${environment.apiUrl}/lesson-quizzes`;

  constructor(private http: HttpClient) {}

  getLessonOptions(): Observable<LessonQuizLessonOption[]> {
    return this.http.get<LessonQuizLessonOption[]>(`${this.endpoint}/lessons`, {
      withCredentials: true,
    });
  }

  getQuizzes(): Observable<LessonQuizSummary[]> {
    return this.http.get<LessonQuizSummary[]>(this.endpoint, { withCredentials: true });
  }

  createQuiz(
    lessonId: string,
    title: string,
    questions: LessonQuizQuestionDraft[],
  ): Observable<LessonQuizSummary> {
    return this.http.post<LessonQuizSummary>(
      this.endpoint,
      { lessonId, title, questions },
      { withCredentials: true },
    );
  }

  getForLesson(lessonId: string, learnerId: string): Observable<LessonQuiz | null> {
    return this.http.get<LessonQuiz | null>(
      `${this.endpoint}/lesson/${encodeURIComponent(lessonId)}?learnerId=${encodeURIComponent(learnerId)}`,
      { withCredentials: true },
    );
  }

  submit(
    quizId: string,
    learnerId: string,
    answers: Record<string, number>,
  ): Observable<LessonQuizResult> {
    return this.http.post<LessonQuizResult>(
      `${this.endpoint}/${encodeURIComponent(quizId)}/attempts`,
      { learnerId, answers },
      { withCredentials: true },
    );
  }
}
