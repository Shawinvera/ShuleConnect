import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { PhoneInputComponent } from '../../../shared/components/phone-input/phone-input';
import { PosthogService } from '../../../services/posthog.service';
import { AnalyticsService } from '../../../services/analytics.service';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { ToastService } from '../../../shared/services/toast.service';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';

@Component({
  selector: 'app-sign-up',
  imports: [CommonModule, FormsModule, SpinnerOverlayComponent, PhoneInputComponent, ToastNotificationComponent],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css',
})
export class SignUp {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  isSubmitting = false;
  showEmailForm = false;
  emailError = '';
  showPassword = false;
  showConfirmPassword = false;
  passwordFocused = false;

  // phone
  showPhoneForm = false;
  fullPhone = '';

  onPhoneChange(val: string) {
    this.fullPhone = val;
  }

  get passwordRules() {
    return {
      minLength: this.password.length >= 6,
      // uppercase: /[A-Z]/.test(this.password),
      // lowercase: /[a-z]/.test(this.password),
      // number: /[0-9]/.test(this.password),
      // special: /[^A-Za-z0-9]/.test(this.password),
    };
  }

  get passwordValid(): boolean {
    return Object.values(this.passwordRules).every(Boolean);
  }

  get passwordsMatch(): boolean {
    return this.confirmPassword.length > 0 && this.password === this.confirmPassword;
  }

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  onEmailBlur() {
    this.emailError =
      this.email && !this.isValidEmail(this.email) ? 'Please enter a valid email address' : '';
  }

  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient,
    private posthogService: PosthogService,
    private analyticsService: AnalyticsService,
    public toast: ToastService,
  ) {}

  navigateToSignIn() {
    this.router.navigate(['/sign-up/sign-in']);
  }

  navigateToLandingPage() {
    this.router.navigate(['/']);
  }

  onSignUp() {
    const usingPhone = this.showPhoneForm && !this.showEmailForm;
    if (usingPhone) {
      if (!this.name || !this.fullPhone || !this.password || !this.confirmPassword) {
        this.errorMessage = 'Please fill in all fields';
        return;
      }
    } else {
      if (!this.name || !this.email || !this.password || !this.confirmPassword) {
        this.errorMessage = 'Please fill in all fields';
        return;
      }
      if (!this.isValidEmail(this.email)) {
        this.emailError = 'Please enter a valid email address';
        return;
      }
    }
    if (!this.passwordValid) {
      this.errorMessage = 'Password does not meet all requirements';
      return;
    }
    if (!this.passwordsMatch) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const nameParts = this.name.trim().split(' ');
    const username = usingPhone ? this.fullPhone : this.email.trim().toUpperCase();
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const countryCode = Intl.DateTimeFormat().resolvedOptions().locale?.split('-')[1] || '';
    const userData = {
      username,
      password: this.password,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ') || nameParts[0],
      role: 'GUARDIAN',
      userTimezone,
      countryCode,
    };

    this.http.post(`${environment.apiUrl}/auth/registration`, userData).subscribe({
      next: (response: any) => {
        this.posthogService.posthog.capture('user_signed_up', {
          method: usingPhone ? 'phone' : 'email',
          role: userData.role,
          country_code: userData.countryCode,
          timezone: userData.userTimezone,
        });
        
        // Track successful registration
        this.analyticsService.trackSuccess('user_registration_success', {
          method: usingPhone ? 'phone' : 'email',
          role: userData.role,
          country_code: userData.countryCode,
          has_full_name: !!(userData.firstName && userData.lastName)
        });
        
        this.router.navigate(['/sign-up/otp-verification'], {
          state: {
            userId: response.generatedId,
            isEmail: !usingPhone,
            registrationData: userData,
          },
        });
      },
      error: (error) => {
        this.posthogService.posthog.capture('$exception', {
          $exception_message: error.error?.message || 'Registration failed',
          $exception_type: 'RegistrationError',
        });
        
        // Track registration failure
        this.analyticsService.trackError('user_registration_failed', error.error?.message || 'Registration failed', {
          method: usingPhone ? 'phone' : 'email',
          error_status: error.status,
          error_code: error.code,
          user_data_provided: {
            has_name: !!this.name,
            has_password: !!this.password,
            method: usingPhone ? 'phone' : 'email'
          }
        });
        
        this.errorMessage = error.error?.message || 'Registration failed';
        this.isSubmitting = false;
      },
    });
  }

  onGoogleSignUp() {
    this.posthogService.posthog.capture('google_sign_in_clicked', { context: 'sign_up' });

    if (Capacitor.isNativePlatform()) {
      GoogleAuth.signOut().catch(() => {}).finally(() => {
        GoogleAuth.signIn().then(user => {
          this.isSubmitting = true;
          const idToken = user.authentication.idToken;
          this.authService.googleMobileSignIn(idToken).subscribe({
            next: () => {
              this.toast.show('Signed in with Google successfully!', 'success');
              const learners = JSON.parse(localStorage.getItem('learners') || '[]');
              if (learners.length === 0) {
                this.router.navigate(['/parent/add-child'], { queryParams: { firstLearner: 'true' } });
              } else {
                this.router.navigate(['/parent']);
              }
            },
            error: () => {
              this.toast.show('Google sign-in failed. Please try again.', 'error');
              this.isSubmitting = false;
            }
          });
        }).catch(() => {
          this.toast.show('Google sign-in was cancelled.', 'warning');
          this.isSubmitting = false;
        });
      });
      return;
    }

    this.isSubmitting = true;
    this.authService.googleSignIn();
  }

  goBackToOptions() {
    this.showEmailForm = false;
    this.showPhoneForm = false;
    // Clear any form data when going back
    this.name = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
    this.fullPhone = '';
    this.errorMessage = '';
    this.emailError = '';
  }

  // Track when user selects email signup method
  selectEmailSignup() {
    this.posthogService.posthog.capture('signup_method_selected', {
      method: 'email',
      source: 'sign_up_page'
    });
    this.showEmailForm = true;
    this.showPhoneForm = false;
  }

  // Track when user selects phone signup method
  selectPhoneSignup() {
    this.posthogService.posthog.capture('signup_method_selected', {
      method: 'phone',
      source: 'sign_up_page'
    });
    this.showPhoneForm = true;
    this.showEmailForm = false;
  }
}
