import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../shared/services/toast.service';
import { PosthogService } from '../../../services/posthog.service';

@Component({
  selector: 'app-otp-verification',
  standalone: true,
  imports: [CommonModule, SpinnerOverlayComponent, ToastNotificationComponent],
  templateUrl: './otp-verification.html',
  styleUrl: './otp-verification.css',
})
export class OtpVerification implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('hiddenInput') hiddenInput!: ElementRef<HTMLInputElement>;

  digits = ['', '', '', ''];
  userId = '';
  isEmail = false;
  isAdmin = false;
  errorMessage = '';
  isSubmitting = false;

  // Timer and resend functionality
  canResend = false;
  resendTimer = 20;
  private timerInterval: any;

  // Store registration data for resend
  private registrationData: any = null;

  constructor(
    private router: Router,
    private http: HttpClient,
    public toast: ToastService,
    private posthogService: PosthogService,
  ) {
    const nav = this.router.getCurrentNavigation();
    this.userId = nav?.extras?.state?.['userId'] || '';
    this.isEmail = nav?.extras?.state?.['isEmail'] || false;
    this.isAdmin = nav?.extras?.state?.['isAdmin'] || false;
    this.registrationData = nav?.extras?.state?.['registrationData'] || null;
  }

  ngOnInit() {
    if (!this.userId) {
      this.router.navigate(['/sign-up/sign-in']);
      return;
    }
    this.startResendTimer();
  }

  ngAfterViewInit() {
    setTimeout(() => this.hiddenInput?.nativeElement.focus(), 100);
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  startResendTimer() {
    this.canResend = false;
    this.resendTimer = 20;

    this.timerInterval = setInterval(() => {
      this.resendTimer--;
      if (this.resendTimer <= 0) {
        this.canResend = true;
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  onResendOTP() {
    if (!this.canResend || !this.registrationData) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    // Clear current OTP digits
    this.digits = ['', '', '', ''];

    // Recall the registration API with the same data
    this.http.post(`${environment.apiUrl}/auth/registration`, this.registrationData).subscribe({
      next: (response: any) => {
        this.userId = response.generatedId;
        this.posthogService.posthog.capture('otp_resent', {
          method: this.isEmail ? 'email' : 'phone',
        });
        this.isSubmitting = false;
        this.startResendTimer();
        // Focus back to the input
        setTimeout(() => this.hiddenInput?.nativeElement.focus(), 100);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to resend OTP. Please try again.';
        this.isSubmitting = false;
      },
    });
  }

  focusHidden() {
    this.hiddenInput?.nativeElement.focus();
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const lastFilled = this.digits.map((d) => d !== '').lastIndexOf(true);
      if (lastFilled !== -1) {
        this.digits[lastFilled] = '';
      }
      return;
    }

    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    const nextEmpty = this.digits.findIndex((d) => d === '');
    if (nextEmpty === -1) return; // all 4 filled

    this.digits[nextEmpty] = event.key;

    if (this.digits.every((d) => d !== '')) {
      this.onVerify();
    }
  }

  get activeIndex(): number {
    return this.digits.findIndex((d) => d === '');
  }

  onVerify() {
    const otp = this.digits.join('');
    if (otp.length !== 4) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    this.http
      .post(`${environment.apiUrl}/auth/user/otp/activation`, {
        otp,
        userId: this.userId,
      })
      .subscribe({
        next: (response: any) => {
          if (response?.successful) {
            this.posthogService.posthog.identify(this.userId);
            this.posthogService.posthog.capture('otp_verified', {
              method: this.isEmail ? 'email' : 'phone',
            });
            this.toast.show('Account verified successfully! Welcome aboard!', 'success', 2000);
            const destination = this.isAdmin
              ? [`/sign-up/${environment.adminLoginPath}`]
              : ['/sign-up/sign-in'];
            // Add a small delay to show the toast before navigation
            setTimeout(() => {
              this.router.navigate(destination);
            }, 1500);
          } else {
            this.errorMessage = response?.errorMessage || 'Verification failed. Please try again.';
            // Clear OTP fields on error so user can re-enter
            this.digits = ['', '', '', ''];
            this.isSubmitting = false;
            // Focus back to the input for better UX
            setTimeout(() => this.hiddenInput?.nativeElement.focus(), 100);
          }
        },
        error: (error) => {
          this.errorMessage =
            error.error?.errorMessage ||
            error.error?.message ||
            'Verification failed. Please try again.';
          // Clear OTP fields on error so user can re-enter
          this.digits = ['', '', '', ''];
          this.isSubmitting = false;
          // Focus back to the input for better UX
          setTimeout(() => this.hiddenInput?.nativeElement.focus(), 100);
        },
      });
  }

  onBackToSignUp() {
    // Clear all data and stop timer
    this.digits = ['', '', '', ''];
    this.errorMessage = '';
    this.userId = '';
    this.registrationData = null;

    // Stop the timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    // Navigate back to sign up
    this.router.navigate(['/sign-up']);
  }
}
