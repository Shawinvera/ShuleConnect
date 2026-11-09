import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, switchMap } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { UserDataService } from './user-data.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private apiUrl = environment.apiUrl;
  private refreshTimer: any = null;
  private isRefreshing = false;
  private refreshFailureCount = 0;
  private readonly MAX_REFRESH_FAILURES = 2;
  private readonly ACCESS_TOKEN_MS = 60 * 60 * 1000; // 1 hour (refresh after 42 minutes)

  constructor(private http: HttpClient, private router: Router, private userDataService: UserDataService) {
    if (this.isAuthenticated()) {
      this.scheduleRefresh();
    }
  }

  login(credentials: { username: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials, {
      responseType: 'text',
      withCredentials: true
    }).pipe(
      switchMap(() => this.getUserDetails()),
      tap(() => this.scheduleRefresh()),
      catchError((error) => { throw error; })
    );
  }

  googleSignIn(): void {
    window.location.href = `${this.apiUrl}/auth/sso/google`;
  }

  googleMobileSignIn(idToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/google/login`, { token: idToken }, {
      withCredentials: true,
      responseType: 'text'
    }).pipe(
      switchMap(() => this.getUserDetails()),
      tap(() => this.scheduleRefresh()),
      catchError((error) => { throw error; })
    );
  }

  getUserDetails(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/me`, { withCredentials: true }).pipe(
      tap((userDetails: any) => {
        const { learners, ...userWithoutLearners } = userDetails;
        this.userDataService.setUserDetails(userWithoutLearners);
        
        // Also update the learners array in localStorage if it exists
        if (learners && Array.isArray(learners)) {
          localStorage.setItem('learners', JSON.stringify(learners));
        }
      }),
      catchError((error) => { throw error; })
    );
  }

  // New method to get fresh user data with learners and update selected child
  refreshUserDataAndUpdateSelectedChild(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/me`, { withCredentials: true }).pipe(
      tap((userDetails: any) => {
        const { learners, ...userWithoutLearners } = userDetails;
        this.userDataService.setUserDetails(userWithoutLearners);
        
        // Update learners array in localStorage
        if (learners && Array.isArray(learners)) {
          localStorage.setItem('learners', JSON.stringify(learners));
          
          // Update selectedChild if we have a selected learner ID
          const selectedLearnerId = localStorage.getItem('selectedLearnerId');
          if (selectedLearnerId) {
            const updatedLearner = learners.find((l: any) => l.id === selectedLearnerId);
            if (updatedLearner) {
              // Build proper display name
              let displayName = '';
              if (updatedLearner.preferredName && updatedLearner.preferredName.trim()) {
                displayName = updatedLearner.preferredName.trim();
              } else if (updatedLearner.firstName && updatedLearner.lastName) {
                displayName = `${updatedLearner.firstName.trim()} ${updatedLearner.lastName.trim()}`;
              } else if (updatedLearner.firstName) {
                displayName = updatedLearner.firstName.trim();
              }
              
              // Calculate age
              const age = this.calculateAge(updatedLearner.dob);
              
              // Update selectedChild with fresh data
              const updatedSelectedChild = {
                id: updatedLearner.id,
                name: displayName,
                age: age,
                avatar: updatedLearner.avatar,
                gender: updatedLearner.gender,
                progress: 0, // Will be updated by progress API
                totalPoints: 0, // Will be updated by progress API
                activeSubjects: 0, // Will be updated by progress API
                memberSince: this.formatMemberSince(updatedLearner.createdAt),
                unitsCompleted: 0,
                quizzesPassed: 0,
                dayStreak: 0,
                subjects: [],
                recentActivities: []
              };
              
              localStorage.setItem('selectedChild', JSON.stringify(updatedSelectedChild));
              console.log('Updated selectedChild with fresh data:', updatedSelectedChild);
            }
          }
        }
      }),
      catchError((error) => { throw error; })
    );
  }

  private calculateAge(dob: string): number {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  private formatMemberSince(createdAt: string): string {
    if (!createdAt) return '-';
    try {
      const date = new Date(createdAt);
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      
      return `${month} ${year}`;
    } catch (error) {
      console.error('Error formatting member since date:', error);
      return '-';
    }
  }

  updateUserProfile(payload: {
    id: string;
    firstName?: string;
    lastName?: string;
    userTimezone?: string;
    countryCode?: string;
    profilePicture?: string;
    role?: string;
    phoneNumber?: string;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/profile/update`, payload, {
      withCredentials: true,
    }).pipe(
      // Refresh local cache so UI immediately reflects updated profile fields.
      switchMap(() => this.getUserDetails()),
      catchError((error) => { throw error; })
    );
  }

  updatePhoneNumber(payload: {
    id: string;
    phoneNumber: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/user/phone-number/update`, payload, {
      withCredentials: true,
    }).pipe(
      // Refresh local cache so UI immediately reflects updated phone number.
      switchMap(() => this.getUserDetails()),
      catchError((error) => { throw error; })
    );
  }

  resetPassword(payload: {
    currentPassword: string;
    newPassword: string;
    newPasswordConfirmation: string;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/auth/password/reset`, payload, {
      withCredentials: true,
      responseType: 'text' as const,
    }).pipe(
      catchError((error) => { throw error; })
    );
  }

  requestPasswordReset(username: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/public/password/reset/request`, { username }).pipe(
      catchError((error) => { throw error; })
    );
  }

  confirmPasswordReset(payload: {
    username: string;
    passwordResetToken: string;
    newPassword: string;
    newPasswordConfirmation: string;
    otp: string;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/public/password/reset`, payload).pipe(
      catchError((error) => { throw error; })
    );
  }

  scheduleRefresh(): void {
    this.clearRefreshTimer();
    // Refresh at 50% of token lifetime (30 min for a 60 min token)
    // This ensures the token is always refreshed well before expiry
    const delay = this.ACCESS_TOKEN_MS * 0.5;
    this.refreshTimer = setTimeout(() => this.doRefresh(), delay);
  }

  private doRefresh(): void {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      console.log('🔵 [AUTH SERVICE] Refresh already in progress, skipping...');
      return;
    }

    this.isRefreshing = true;
    console.log('🔵 [AUTH SERVICE] Starting token refresh...');
    
    this.http.post(`${this.apiUrl}/auth/refresh`, {}, { withCredentials: true, responseType: 'text' }).subscribe({
      next: () => {
        console.log('🟢 [AUTH SERVICE] Token refresh successful');
        this.isRefreshing = false;
        this.refreshFailureCount = 0; // Reset failure count on success
        this.scheduleRefresh();
      },
      error: (error) => {
        console.error('🔴 [AUTH SERVICE] Token refresh failed:', error);
        this.isRefreshing = false;
        this.refreshFailureCount++;
        
        // Only logout after multiple failures to avoid premature logouts
        if (this.refreshFailureCount >= this.MAX_REFRESH_FAILURES) {
          console.error('🔴 [AUTH SERVICE] Max refresh failures reached, logging out...');
          this.clearStorage();
          this.userDataService.clearUserDetails();
          this.router.navigate(['/sign-up/sign-in']);
        } else {
          console.log(`🔵 [AUTH SERVICE] Retry ${this.refreshFailureCount}/${this.MAX_REFRESH_FAILURES}, scheduling retry in 5 seconds...`);
          // Retry after a short delay
          setTimeout(() => {
            if (this.refreshFailureCount < this.MAX_REFRESH_FAILURES) {
              this.doRefresh();
            }
          }, 5000);
        }
      }
    });
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  getUserData(): any {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = localStorage.getItem('userDetails');
      return data ? JSON.parse(data) : null;
    }
    return null;
  }

  logout(): Observable<any> {
    this.clearRefreshTimer();
    this.isRefreshing = false;
    this.refreshFailureCount = 0;
    return this.http.post(`${this.apiUrl}/auth/logout`, {}, {
      responseType: 'text',
      withCredentials: true
    }).pipe(
      catchError(() => of('Logout completed')),
      tap(() => {
        this.clearStorage();
        this.userDataService.clearUserDetails();
      })
    );
  }

  private clearStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const saved = localStorage.getItem('lp_saved_accounts');
    localStorage.clear();
    if (saved) localStorage.setItem('lp_saved_accounts', saved);
  }

  isAuthenticated(): boolean {
    return !!this.getUserData();
  }

  ngOnDestroy(): void {
    this.clearRefreshTimer();
    this.isRefreshing = false;
  }
}