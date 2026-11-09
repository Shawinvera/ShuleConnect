import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserDataService } from '../../../services/user-data.service';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { PhoneInputComponent } from '../../../shared/components/phone-input/phone-input';
import { PosthogService } from '../../../services/posthog.service';
import { AnalyticsService } from '../../../services/analytics.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

@Component({
  selector: 'app-sign-in',
  imports: [CommonModule, FormsModule, SpinnerOverlayComponent, PhoneInputComponent, ToastNotificationComponent],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css',
})
export class SignIn implements OnInit, OnDestroy {
  email = '';
  password = '';
  errorMessage = '';
  isSubmitting = false;
  emailError = '';
  showPassword = false;
  savePassword = true; // Default to saving password

  activeForm: 'email' | 'phone' | null = null;
  fullPhone = '';

  savedAccounts: { username: string; type: 'email' | 'phone'; password?: string; fullName?: string }[] = [];
  selectedAccount: { username: string; type: 'email' | 'phone'; password?: string; fullName?: string } | null = null;

  private readonly STORAGE_KEY = 'lp_saved_accounts';

  // Forgot password flow
  forgotStep: 'request' | 'reset' | null = null;
  forgotUsername = '';
  forgotFullPhone = '';
  forgotEmailError = '';
  forgotIsSubmitting = false;
  private resetToken = '';
  resetForm = { newPassword: '', newPasswordConfirmation: '', otp: '' };
  showResetPassword = false;
  showResetConfirm = false;

  get resetPasswordRules() { return { minLength: this.resetForm.newPassword.length >= 6 }; }
  get resetPasswordValid() { return this.resetForm.newPassword.length >= 6; }
  get resetPasswordsMatch() {
    return this.resetForm.newPasswordConfirmation.length > 0 &&
      this.resetForm.newPassword === this.resetForm.newPasswordConfirmation;
  }

  private loadSavedAccounts() {
    try {
      this.savedAccounts = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
      // Remove duplicates based on username
      this.savedAccounts = this.savedAccounts.filter((account, index, self) =>
        index === self.findIndex(a => a.username === account.username)
      );
      // Save the cleaned up accounts back to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.savedAccounts));
    } catch {
      this.savedAccounts = [];
    }
  }

  private saveAccount(username: string, type: 'email' | 'phone', password?: string, fullName?: string) {
    // Remove any existing account with the same username (case-insensitive for emails)
    const normalizedUsername = type === 'email' ? username.toLowerCase() : username;
    this.savedAccounts = this.savedAccounts.filter(a => {
      const existingNormalized = a.type === 'email' ? a.username.toLowerCase() : a.username;
      return existingNormalized !== normalizedUsername;
    });

    // Add the new account at the beginning
    this.savedAccounts.unshift({ username, type, password, fullName });

    // Keep only the latest 5 accounts
    this.savedAccounts = this.savedAccounts.slice(0, 5);

    // Save to localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.savedAccounts));
  }

  selectSavedAccount(account: { username: string; type: 'email' | 'phone'; password?: string; fullName?: string }) {
    this.selectedAccount = account;
    this.activeForm = account.type;
    if (account.type === 'email') this.email = account.username;
    else this.fullPhone = account.username;
    // Auto-fill password if saved
    if (account.password) {
      this.password = account.password;
      this.savePassword = true; // Set to true since password was previously saved
    } else {
      this.password = '';
      this.savePassword = true; // Default to true for new password entry
    }
  }

  removeAccount(account: { username: string; type: 'email' | 'phone'; password?: string; fullName?: string }, event: Event) {
    event.stopPropagation();
    this.savedAccounts = this.savedAccounts.filter(a => a.username !== account.username);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.savedAccounts));
  }

  // Method to clear all saved accounts (for debugging)
  clearAllSavedAccounts() {
    this.savedAccounts = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Helper method to capitalize names properly
  private capitalizeWords(text: string): string {
    if (!text) return text;
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Helper method to get display name for saved account
  getAccountDisplayName(account: { username: string; type: 'email' | 'phone'; fullName?: string }): string {
    if (account.fullName) {
      return this.capitalizeWords(account.fullName);
    }
    // Fallback to username if no full name
    return account.type === 'email' ? account.username.toLowerCase() : account.username;
  }

  // Helper method to get formatted username for display
  getFormattedUsername(account: { username: string; type: 'email' | 'phone' }): string {
    return account.type === 'email' ? account.username.toLowerCase() : account.username;
  }

  onPhoneChange(val: string) {
    this.fullPhone = val;
  }

  constructor(
    private router: Router,
    private authService: AuthService,
    private userDataService: UserDataService,
    private posthogService: PosthogService,
    private analyticsService: AnalyticsService,
    public toast: ToastService,
  ) {
    this.loadSavedAccounts();
  }

  ngOnInit() {
    // Initialize for existing accounts
    // Reset spinner state when component loads (handles back navigation)
    this.isSubmitting = false;
  }

  ngOnDestroy() {
    // Clean up any timers if component is destroyed
    if ((window as any).ssoResetTimer) {
      clearTimeout((window as any).ssoResetTimer);
      delete (window as any).ssoResetTimer;
    }
  }

  @HostListener('window:focus', ['$event'])
  onWindowFocus(event: any): void {
    // Reset spinner when window regains focus (user came back from OAuth)
    this.isSubmitting = false;
  }

  @HostListener('window:pageshow', ['$event'])
  onPageShow(event: any): void {
    // Reset spinner when page is shown (handles back/forward navigation)
    this.isSubmitting = false;
  }

  navigateToSignUp() {
    this.router.navigate(['/sign-up']);
  }

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  onEmailBlur() {
    this.emailError =
      this.email && !this.isValidEmail(this.email) ? 'Please enter a valid email address' : '';
  }

  onSignIn() {
    this.isSubmitting = true;
    this.errorMessage = '';
    const username = this.activeForm === 'phone' ? this.fullPhone : this.email.trim().toUpperCase();
    const loginData = { username, password: this.password };
    this.authService.login(loginData).subscribe({
      next: (response: any) => {
        const userId = response?.id || username;
        this.posthogService.posthog.identify(userId, {
          email: this.activeForm !== 'phone' ? username.toLowerCase() : undefined,
          phone: this.activeForm === 'phone' ? username : undefined,
        });
        this.posthogService.posthog.capture('user_signed_in', {
          method: this.activeForm === 'phone' ? 'phone' : 'email',
        });
        const type = this.activeForm === 'phone' ? 'phone' : 'email';
        // Get the full name from user data service
        const firstName = this.userDataService.getFirstName();
        const lastName = this.userDataService.getLastName();
        const fullName = firstName && lastName ? `${firstName} ${lastName}`.trim() : firstName || undefined;
        // Only save password if user opted to save it
        this.saveAccount(username, type, this.savePassword ? this.password : undefined, fullName);
        this.router.navigate(['/parent']);
      },
      error: (error) => {
        // Track login failure with detailed error info
        this.analyticsService.trackError('user_login_failed', error.message || 'Login failed', {
          error_status: error.status,
          error_code: error.code,
          method: this.activeForm === 'phone' ? 'phone' : 'email',
          api_url: error.url,
          network_error: error.name === 'HttpErrorResponse' && error.status === 0
        });

        if (error.status === 429) {
          this.errorMessage =
            error.error?.message || 'Too many login attempts. Please try again later.';
        } else if (error.status === 401) {
          this.errorMessage = 'Invalid credentials. Please check your email/phone and password.';
        } else if (error.status === 0) {
          this.errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          this.errorMessage = error.error?.message || 'Login failed. Please try again.';
        }
        this.isSubmitting = false;
      },
    });
  }

  onForgotEmailBlur() {
    this.forgotEmailError =
      this.forgotUsername && !this.isValidEmail(this.forgotUsername)
        ? 'Please enter a valid email address'
        : '';
  }

  openForgotPassword() {
    this.forgotStep = 'request';
    this.forgotUsername = this.activeForm === 'phone' ? '' : this.email.trim();
    this.forgotFullPhone = this.activeForm === 'phone' ? this.fullPhone : '';
    this.forgotEmailError = '';
    this.errorMessage = '';
  }

  closeForgotPassword() {
    this.forgotStep = null;
    this.forgotUsername = '';
    this.forgotFullPhone = '';
    this.forgotEmailError = '';
    this.resetToken = '';
    this.resetForm = { newPassword: '', newPasswordConfirmation: '', otp: '' };
  }

  submitForgotRequest() {
    if (this.activeForm === 'phone') {
      if (!this.forgotFullPhone) {
        this.toast.show('Please enter a valid phone number.', 'warning');
        return;
      }
    } else {
      if (!this.forgotUsername.trim()) {
        this.toast.show('Please enter your email.', 'warning');
        return;
      }
      if (!this.isValidEmail(this.forgotUsername.trim())) {
        this.forgotEmailError = 'Please enter a valid email address';
        this.toast.show('Please enter a valid email address.', 'warning');
        return;
      }
    }
    const identifier = this.activeForm === 'phone' ? this.forgotFullPhone : this.forgotUsername.trim();
    this.forgotIsSubmitting = true;
    this.authService.requestPasswordReset(identifier).subscribe({
      next: (res: any) => {
        this.forgotIsSubmitting = false;
        if (res?.successful === false) {
          this.toast.show(res.errorMessage || 'Could not send reset request. Please try again.', 'error');
          return;
        }
        this.resetToken = res?.data?.passwordResetToken || '';
        this.forgotUsername = identifier;
        this.forgotStep = 'reset';
      },
      error: (err) => {
        this.forgotIsSubmitting = false;
        const body = err?.error;
        const msg = (typeof body === 'string' ? (() => { try { return JSON.parse(body); } catch { return {}; } })() : body)?.errorMessage;
        this.toast.show(msg || 'Could not send reset request. Please try again.', 'error');
      },
    });
  }

  submitPasswordReset() {
    if (!this.resetPasswordValid) {
      this.toast.show('New password must be at least 6 characters.', 'warning'); return;
    }
    if (!this.resetPasswordsMatch) {
      this.toast.show('Passwords do not match.', 'warning'); return;
    }
    if (!this.resetForm.otp.trim()) {
      this.toast.show('Please enter the OTP sent to you.', 'warning'); return;
    }
    this.forgotIsSubmitting = true;
    this.authService.confirmPasswordReset({
      username: this.forgotUsername.trim(),
      passwordResetToken: this.resetToken,
      newPassword: this.resetForm.newPassword,
      newPasswordConfirmation: this.resetForm.newPasswordConfirmation,
      otp: this.resetForm.otp.trim(),
    }).subscribe({
      next: () => {
        this.forgotIsSubmitting = false;
        this.closeForgotPassword();
        this.toast.show('Password reset successfully! Please sign in.', 'success');
      },
      error: (err) => {
        this.forgotIsSubmitting = false;
        const body = err?.error;
        const parsed = typeof body === 'string' ? (() => { try { return JSON.parse(body); } catch { return {}; } })() : body;
        this.toast.show(parsed?.errorMessage || 'Failed to reset password. Please try again.', 'error');
      },
    });
  }

  onGoogleSignIn() {
    this.posthogService.posthog.capture('google_sign_in_clicked', { context: 'sign_in' });

    if (Capacitor.isNativePlatform()) {
      GoogleAuth.signOut().catch(() => {}).finally(() => {
        GoogleAuth.signIn().then(user => {
          this.isSubmitting = true;
          const idToken = user.authentication.idToken;
          this.authService.googleMobileSignIn(idToken).subscribe({
            next: (userDetails: any) => {
              this.toast.show('Signed in with Google successfully!', 'success');
              const learners = JSON.parse(localStorage.getItem('learners') || '[]');
              if (learners.length === 0) {
                this.router.navigate(['/parent/add-child'], { queryParams: { firstLearner: 'true' } });
              } else {
                this.router.navigate(['/parent']);
              }
            },
            error: (err) => {
              this.errorMessage = err.error?.message || 'Google sign-in failed. Please try again.';
              this.toast.show(this.errorMessage, 'error');
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
    const resetTimer = setTimeout(() => {
      this.isSubmitting = false;
    }, 3000);
    (window as any).ssoResetTimer = resetTimer;
    this.authService.googleSignIn();
  }

  goBackToOptions() {
    this.activeForm = null;
    this.selectedAccount = null;
    this.email = '';
    this.password = '';
    this.fullPhone = '';
    this.errorMessage = '';
    this.emailError = '';
    this.savePassword = true; // Reset to default
  }
}
