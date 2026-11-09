import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, delay, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { UserDataService } from './user-data.service';
import { environment } from '../../environments/environment';

let isRefreshing = false;
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 2;

export const tokenRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const http = inject(HttpClient);
  const router = inject(Router);
  const userDataService = inject(UserDataService);

  // Skip interceptor for refresh, login, asset requests, and already-retried requests
  if (req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/login') ||
    req.url.includes('/assets/') ||
    req.headers.has('X-Retry') ||
    req.headers.has('X-Skip-Interceptor')) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // If already refreshing or max attempts reached, logout immediately
      if (isRefreshing || refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        console.log('🔴 [TOKEN INTERCEPTOR] Max refresh attempts reached or already refreshing, logging out...');
        isRefreshing = false;
        refreshAttempts = 0;
        localStorage.clear();
        userDataService.clearUserDetails();
        router.navigate(['/sign-up/sign-in']);
        return throwError(() => error);
      }

      isRefreshing = true;
      refreshAttempts++;
      console.log(`🔵 [TOKEN INTERCEPTOR] Attempting token refresh (${refreshAttempts}/${MAX_REFRESH_ATTEMPTS})...`);

      return http.post(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true, responseType: 'text' }).pipe(
        switchMap(() => {
          console.log('🟢 [TOKEN INTERCEPTOR] Token refresh successful');
          isRefreshing = false;
          refreshAttempts = 0; // Reset on success
          // Clone request with retry marker so interceptor skips it
          const retryReq = req.clone({ setHeaders: { 'X-Retry': 'true' } });
          return of(null).pipe(
            delay(500),
            switchMap(() => next(retryReq))
          );
        }),
        catchError((refreshError) => {
          console.error('🔴 [TOKEN INTERCEPTOR] Token refresh failed:', refreshError);
          isRefreshing = false;

          if (refreshError.status === 401 || refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
            console.log('🔴 [TOKEN INTERCEPTOR] Refresh failed permanently, logging out...');
            refreshAttempts = 0;
            localStorage.clear();
            userDataService.clearUserDetails();
            router.navigate(['/sign-up/sign-in']);
          }
          return throwError(() => refreshError);
        })
      );
    })
  );
};
