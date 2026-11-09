import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';


export interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  amount: number;
  billingType: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  courseId: string;
  status: number;
  rankCode: number;
}

@Injectable({
  providedIn: 'root',
})
export class SubscriptionTiers {
  private readonly endpoint = `${environment.apiUrl}/public/subscription`;

  constructor(private http: HttpClient) {}

  getTiersByCourse(courseId: string): Observable<SubscriptionTier[]> {
    return this.http.get<SubscriptionTier[]>(`${this.endpoint}/tiers/${courseId}?status=1`);
  }
  
}
