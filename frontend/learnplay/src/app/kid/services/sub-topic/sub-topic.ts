import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// This matches your SubTopicSummaryDto from Java
export interface SubTopicSummary {
  id: string;
  name: string;
  description: string;
  active: boolean;
  lessonCount: number;
  orderIndex: number;
}

@Injectable({
  providedIn: 'root',
})
export class SubTopicService {
  private readonly endpoint = `${environment.apiUrl}/sub-topic`; 

  constructor(private http: HttpClient) {}

  public getSubTopicsByTopicId(topicId: string): Observable<SubTopicSummary[]> {
    return this.http.get<SubTopicSummary[]>(`${this.endpoint}/fetch/byTopicId/${topicId}`);
  }
}