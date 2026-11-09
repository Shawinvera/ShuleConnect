import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Learner {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  points: number;
  gradeId: string;
  gradeName: string; // Added based on your JSON
  courseId: string; // Added based on your JSON
  subscriptionExpiryDate?: string | null; // IMPORTANT: Add this
  // Add other fields as per your LearnerDto
}
@Injectable({
  providedIn: 'root',
})
export class LearnerService {
  private readonly endpoint = `${environment.apiUrl}/learner`;

  // 1. Create the broadcast stream
  private selectedLearnerSubject = new BehaviorSubject<any>(this.getStoredLearner());
  selectedLearner$ = this.selectedLearnerSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getStoredLearner() {
    const data = localStorage.getItem('selectedLearner');
    return data ? JSON.parse(data) : null;
  }

  public updateSelectedLearner(newData: any) {
    const currentData = this.getStoredLearner() || {};

    // MERGE: Keep existing fields (like subscription) and only update what changed
    const mergedData = {
      ...currentData,
      ...newData,
    };

    localStorage.setItem('selectedLearner', JSON.stringify(mergedData));
    this.selectedLearnerSubject.next(mergedData); // Broadcast merged data to Navbar/Dashboard
  }

  // Central logic for checking subscription status
  // public isSubscriptionActive(expiryDate: string | null | undefined): boolean {
  //   if (!expiryDate) return false;

  //   const expiry = new Date(expiryDate);

  //   // Handle invalid dates
  //   if (isNaN(expiry.getTime())) return false;

  //   return expiry > new Date();
  // }

  public isSubscriptionActive(expiryDate: string | null | undefined): boolean {
    if (!expiryDate) return false;

    const expiry = new Date(expiryDate);
    const now = new Date();

    // If the date is valid and expiry is in the future
    return !isNaN(expiry.getTime()) && expiry > now;
  }

  public getSelectedLearnerStatus(): boolean {
    const data = localStorage.getItem('selectedLearner');
    if (!data) return false;
    const learner = JSON.parse(data);
    return this.isSubscriptionActive(learner.subscriptionExpiryDate);
  }

  public getLearnerByUserId(userId: string): Observable<Learner[]> {
    return this.http.get<Learner[]>(`${this.endpoint}/fetchByUserId/${userId}`);
  }

  public getLearnerLessonSummary(learnerId: string): Observable<any> {
    return this.http.get<any>(`${this.endpoint}/fetchLessonSummary/${learnerId}`);
  }
}
