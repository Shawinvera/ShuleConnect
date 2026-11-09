import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ParentApiService } from '../parent/services/parent-api.service';
import { map, catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const parentApiService = inject(ParentApiService);
  const requiredRole = route.data['role'];

  // Check localStorage first to avoid unnecessary network call
  const cachedUser = authService.getUserData();
  if (cachedUser?.role) {
    if (requiredRole && cachedUser.role !== requiredRole) {
      if (cachedUser.role === 'ADMIN') return of(router.createUrlTree(['/courses']));
      if (cachedUser.role === 'GUARDIAN') {
        // For GUARDIAN users, always check if they have learners before redirecting
        return checkGuardianLearners(cachedUser.id, parentApiService, router, state.url);
      }
      return of(router.createUrlTree(['/sign-up/sign-in']));
    }
    
    // For GUARDIAN users accessing any parent route, check for learners
    if (cachedUser.role === 'GUARDIAN' && (state.url.startsWith('/parent') || state.url === '/who-are-you')) {
      return checkGuardianLearners(cachedUser.id, parentApiService, router, state.url);
    }
    
    return of(true);
  }

  return authService.getUserDetails().pipe(
    switchMap((userDetails: any) => {
      const userRole = userDetails?.role;
      if (!userRole) return of(router.createUrlTree(['/sign-up/sign-in']));
      
      if (requiredRole && userRole !== requiredRole) {
        if (userRole === 'ADMIN') return of(router.createUrlTree(['/courses']));
        if (userRole === 'GUARDIAN') {
          // For GUARDIAN users, always check if they have learners before redirecting
          return checkGuardianLearners(userDetails.id, parentApiService, router, state.url);
        }
        return of(router.createUrlTree(['/sign-up/sign-in']));
      }
      
      // For GUARDIAN users accessing any parent route, check for learners
      if (userRole === 'GUARDIAN' && (state.url.startsWith('/parent') || state.url === '/who-are-you')) {
        return checkGuardianLearners(userDetails.id, parentApiService, router, state.url);
      }
      
      return of(true);
    }),
    catchError(() => {
      console.error('REDIRECT FROM: auth.guard.ts catchError');
      return of(router.createUrlTree(['/sign-up/sign-in']));
    })
  );
};

function checkGuardianLearners(userId: string, parentApiService: ParentApiService, router: Router, currentUrl: string) {
  return parentApiService.fetchLearnersByUserId(userId).pipe(
    map((learners: any[]) => {
      if (!learners || learners.length === 0) {
        // No learners found, redirect to add-child with a flag
        // But don't redirect if already on add-child page to avoid infinite loop
        if (currentUrl.includes('/add-child')) {
          return true; // Allow access to add-child page
        }
        return router.createUrlTree(['/parent/add-child'], { 
          queryParams: { firstLearner: 'true' } 
        });
      }
      // Has learners, allow access to who-are-you or parent routes
      return true; // Allow access to the requested route
    }),
    catchError((error) => {
      console.error('Error checking learners:', error);
      // On error, if trying to access add-child, allow it
      if (currentUrl.includes('/add-child')) {
        return of(true);
      }
      // Otherwise default to who-are-you for role selection
      return of(router.createUrlTree(['/who-are-you']));
    })
  );
}
