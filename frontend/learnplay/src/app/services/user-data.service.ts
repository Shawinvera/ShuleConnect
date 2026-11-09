import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserDataService {
  private readonly userDetailsSubject = new BehaviorSubject<any>(null);
  readonly userDetails$ = this.userDetailsSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.refreshFromStorage();
  }

  refreshFromStorage(): void {
    this.userDetailsSubject.next(this.readUserDetailsFromStorage());
  }

  setUserDetails(userDetails: any): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem('userDetails', JSON.stringify(userDetails));
    this.userDetailsSubject.next(userDetails);
  }

  clearUserDetails(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.removeItem('userDetails');
    this.userDetailsSubject.next(null);
  }

  private readUserDetailsFromStorage(): any {
    if (!isPlatformBrowser(this.platformId)) {
      return null; // Return null on server side
    }

    const data = localStorage.getItem('userDetails');
    console.log('🔵 [USER DATA SERVICE] getUserDetails called, raw data:', data);
    const parsed = data ? JSON.parse(data) : null;
    console.log('🔵 [USER DATA SERVICE] getUserDetails parsed:', parsed);
    return parsed;
  }
  
  getUserDetails(): any {
    return this.userDetailsSubject.value ?? this.readUserDetailsFromStorage();
  }

  getUserId(): string | null {
    const details = this.getUserDetails();
    console.log('🔵 [USER DATA SERVICE] getUserId:', details?.id || null);
    return details?.id || null;
  }

  getUsername(): string | null {
    const details = this.getUserDetails();
    return details?.username || null;
  }

  getFirstName(): string | null {
    const details = this.getUserDetails();
    return details?.firstName || null;
  }

  getLastName(): string | null {
    const details = this.getUserDetails();
    return details?.lastName || null;
  }

  getUserRole(): string | null {
    const details = this.getUserDetails();
    const role = details?.role || null;
    console.log('🔵 [USER DATA SERVICE] getUserRole:', role);
    return role;
  }

  isAuthenticated(): boolean {
    return !!this.getUserDetails();
  }
}
