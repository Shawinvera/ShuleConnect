import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Lessons API
  getLessons(): Observable<any> {
    return this.http.get(`${this.baseUrl}/lessons`);
  }

  createLesson(lesson: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/lessons`, lesson);
  }

  updateLesson(id: number, lesson: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/lessons/${id}`, lesson);
  }

  deleteLesson(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/lessons/${id}`);
  }

  // Notes API
  getNotes(lessonId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/lessons/${lessonId}/notes`);
  }

  createNote(lessonId: number, note: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/lessons/${lessonId}/notes`, note);
  }
}