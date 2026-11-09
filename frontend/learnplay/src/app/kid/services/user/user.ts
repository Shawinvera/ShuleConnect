import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface UserMeResponse {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  // ... add other fields if needed
}

@Injectable({
  providedIn: 'root',
})
export class User {
  private readonly endpoint = `${environment.apiUrl}/user/me`;

  constructor(private http: HttpClient) {}

  public getUserMe(): Observable<UserMeResponse> {
    return this.http.get<UserMeResponse>(this.endpoint);
  }
}