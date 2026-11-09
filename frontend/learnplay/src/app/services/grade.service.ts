import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GradeService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createGrade(gradeData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/grade`, gradeData, { 
      withCredentials: true 
    });
  }

  getGradesByCourse(courseId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/grade/fetchByCourse/${courseId}`, { 
      withCredentials: true 
    });
  }
}