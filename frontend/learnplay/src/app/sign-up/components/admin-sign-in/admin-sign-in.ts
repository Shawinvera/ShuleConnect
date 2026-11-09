import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../shared/services/toast.service';
import { PhoneInputComponent } from '../../../shared/components/phone-input/phone-input';

@Component({
  selector: 'app-admin-sign-in',
  imports: [CommonModule, FormsModule, SpinnerOverlayComponent, ToastNotificationComponent, PhoneInputComponent],
  templateUrl: './admin-sign-in.html',
  styleUrl: './admin-sign-in.css',
})
export class AdminSignIn {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  isSignUp = false;
  errorMessage = '';
  isSubmitting = false;
  showPassword = false;
  showConfirmPassword = false;
  passwordFocused = false;

  // phone
  activeForm: 'email' | 'phone' = 'phone';
  fullPhone = '';

  onPhoneChange(val: string) { this.fullPhone = val; }

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

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    public toast: ToastService
  ) {}

  toggleMode() {
    this.isSignUp = !this.isSignUp;
    this.errorMessage = '';
    this.password = '';
    this.confirmPassword = '';
    this.name = '';
    this.fullPhone = '';
    this.activeForm = 'phone';
  }

  onAdminSignIn() {
    this.errorMessage = '';
    const username = this.activeForm === 'phone' ? this.fullPhone : this.email.trim().toUpperCase();
    const loginData = { username, password: this.password };
    this.isSubmitting = true;
    this.authService.login(loginData).subscribe({
      next: (userData: any) => {
        this.isSubmitting = false;
        if (userData.role !== 'ADMIN') {
          this.errorMessage = 'Access denied. Admin credentials required.';
          return;
        }
        this.router.navigate(['/courses']);
      },
      error: (error) => {
        this.isSubmitting = false;
        if (error.status === 429) {
          this.errorMessage = error.error?.message || 'Too many login attempts. Please try again later.';
        } else if (error.status === 401) {
          this.errorMessage = 'Invalid credentials. Please check your details.';
        } else {
          this.errorMessage = error.error?.message || 'Login failed. Please try again.';
        }
      }
    });
  }

  onAdminSignUp() {
    this.errorMessage = '';
    const usingPhone = this.activeForm === 'phone';
    if (usingPhone) {
      if (!this.name || !this.fullPhone || !this.password || !this.confirmPassword) {
        this.errorMessage = 'Please fill in all fields'; return;
      }
    } else {
      if (!this.name || !this.email || !this.password || !this.confirmPassword) {
        this.errorMessage = 'Please fill in all fields'; return;
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
    const nameParts = this.name.trim().split(' ');
    const username = usingPhone ? this.fullPhone : this.email.trim().toUpperCase();
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const userData = {
      username,
      password: this.password,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ') || nameParts[0],
      role: 'ADMIN',
      userTimezone
    };

    this.http.post(`${environment.apiUrl}/auth/registration`, userData).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.router.navigate(['/sign-up/otp-verification'], {
          state: { userId: response.generatedId, isEmail: !usingPhone, isAdmin: true }
        });
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
        this.toast.show(this.errorMessage, 'error');
      }
    });
  }
}
