import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MPesaPaymentService } from '../../services/m-pesa-payment/m-pesa-payment';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../shared/services/toast.service';
import { LearnerService } from '../../services/learner/learner';
import { User } from '../../services/user/user';
import { PosthogService } from '../../../services/posthog.service';

export interface Plan {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  currency: string;
  period: string;
  icon: string;
  iconBg: string;
  textColor: string;
}

@Component({
  selector: 'app-payment-method',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatRippleModule, FormsModule, ToastNotificationComponent],
  templateUrl: './payment-method.html',
  styles: [
    `
      .accordion-content {
        transition:
          max-height 0.3s ease-in-out,
          opacity 0.3s ease-in-out;
        max-height: 0;
        opacity: 0;
        overflow: hidden;
      }
      .accordion-content.expanded {
        max-height: 1000px;
        opacity: 1;
      }
    `,
  ],
})
export class PaymentMethod implements OnInit {
  @Input() plan!: Plan;
  @Output() paymentComplete = new EventEmitter<void>();
  @Output() backToPlans = new EventEmitter<void>();

  mpesaNumber: string = '';
  selectedMethodId: string | null = 'mpesa';
  paymentStatus: 'IDLE' | 'WAITING' | 'SUCCESS' | 'FAILED' = 'IDLE';
  pollingTimer: any;
  countdown: number = 0;
  countdownTimer: any;
  failureReason: string = '';
  currentCheckoutId: string = '';
  showManualConfirm: boolean = false;
  initialWaitTimer: any; // To store the 10s timeout
  isVerifying: boolean = false;

  constructor(
    private mpesaService: MPesaPaymentService,
    private learnerService: LearnerService,
    private userService: User,
    public toast: ToastService,
    private posthogService: PosthogService,
  ) {}

  ngOnInit() {
    this.fetchAndFormatUserPhone();
  }

  fetchAndFormatUserPhone() {
    this.userService.getUserMe().subscribe({
      next: (user) => {
        if (user.phoneNumber) {
          // Convert +2547... or 2547... to 07...
          let rawNumber = user.phoneNumber.replace(/\s+/g, ''); // Remove spaces

          if (rawNumber.startsWith('+254')) {
            this.mpesaNumber = '0' + rawNumber.substring(4);
          } else if (rawNumber.startsWith('254')) {
            this.mpesaNumber = '0' + rawNumber.substring(3);
          } else {
            this.mpesaNumber = rawNumber; // Fallback
          }

          // Ensure it only takes the first 10 digits
          this.mpesaNumber = this.mpesaNumber.substring(0, 10);
        }
      },
      error: (err) => {
        console.warn('Could not auto-fetch phone number', err);
      },
    });
  }

  validateMpesa(event: any) {
    const input = event.target.value;
    this.mpesaNumber = input.replace(/\D/g, '').substring(0, 10);
  }

  toggleMethod(methodId: string) {
    this.selectedMethodId = this.selectedMethodId === methodId ? null : methodId;
  }

  processPayment(method: string) {
    if (method !== 'M-PESA') return;

    const learnerData = localStorage.getItem('selectedLearner');
    let userId = localStorage.getItem('userId');
    if (!userId) {
      const userDetails = localStorage.getItem('userDetails');
      if (userDetails) userId = JSON.parse(userDetails).id;
    }

    if (!learnerData || !userId) {
      this.toast.show('Your session has expired. Please sign in again.', 'error');
      return;
    }

    const learner = JSON.parse(learnerData);
    const payload = {
      phoneNumber: this.mpesaNumber,
      userId: userId,
      learnerId: learner.id,
      subscriptionId: this.plan.id,
    };

    this.paymentStatus = 'WAITING';
    this.showManualConfirm = false;
    this.failureReason = '';
    this.startUiCountdown(10);
    this.posthogService.posthog.capture('payment_initiated', {
      method: 'mpesa',
      plan_id: this.plan.id,
      plan_name: this.plan.title,
      plan_price: this.plan.price,
      plan_currency: this.plan.currency,
      plan_period: this.plan.period,
    });
    //this.startUiCountdown(45); // Start visual countdown for the user

    this.mpesaService.triggerPayment(payload).subscribe({
      next: (res) => {
        if (res.successful) {
          this.currentCheckoutId = res.data;
          console.log('✅ STK Triggered. Waiting 10s...');

          this.initialWaitTimer = setTimeout(() => {
            this.showManualConfirm = true;
            // Automatically check once at the 10s mark
            this.executeInitialQuery(this.currentCheckoutId);
          }, 10000);
        } else {
          this.handleFailure('TRIGGER_FAILED');
        }
      },
      error: () => this.handleFailure('SERVER_ERROR'),
    });
  }

  executeInitialQuery(checkoutID: string) {
    this.mpesaService.queryStatus(checkoutID).subscribe({
      next: (res) => {
        this.handleStatusResult(res.data, checkoutID);
      },
      error: (err) => {
        // FIX: Capture the error body even if it is a 400 Bad Request
        this.parseErrorResponse(err, checkoutID);
      },
    });
  }

  // New helper to handle the Polling and check error bodies
  private parseErrorResponse(err: any, checkoutID: string) {
    // This looks into the 400 error body sent by your Java backend
    const errorData = err.error?.data;

    if (errorData && !['PROCESSING', 'PENDING'].includes(errorData)) {
      // If it's a real failure (CANCELLED, INSUFFICIENT-FUNDS, etc.)
      this.handleStatusResult(errorData, checkoutID);
    } else {
      // If it's just 'PROCESSING' or a network glitch, start/continue polling
      this.startPollingInterval(checkoutID);
    }
  }

  handleStatusResult(status: string, checkoutID: string) {
    this.isVerifying = false;

    if (status === 'COMPLETED') {
      this.handleSuccess();
    } else if (status === 'PENDING' || status === 'PROCESSING') {
      // DO NOT change status. Keep showing the WAITING screen + the Button.
      if (!this.pollingTimer) {
        this.startPollingInterval(checkoutID);
      }
    } else {
      // It is a terminal error (CANCELLED, INSUFFICIENT-FUNDS, INCORRECT-PIN)
      this.handleFailure(status);
    }
  }

  startPollingInterval(checkoutID: string) {
    if (this.pollingTimer) return;

    // 1. Immediately start the visual countdown for the first polling window
    this.startUiCountdown(10);

    this.pollingTimer = setInterval(() => {
      // 2. Every 10 seconds, reset the visual countdown to 10
      this.startUiCountdown(10);

      this.mpesaService.queryStatus(checkoutID).subscribe({
        next: (res) => this.handleStatusResult(res.data, checkoutID),
        error: (err) => {
          // If it's a 400 error, parse it. If it's a network crash, the countdown
          // just continues and we try again in the next interval.
          this.parseErrorResponse(err, checkoutID);
        },
      });
    }, 10000); // Poll every 10 seconds
  }

  // NEW METHOD for manual click
  manualConfirm() {
    if (!this.currentCheckoutId || this.isVerifying) return;

    this.isVerifying = true;
    this.toast.show('Verifying your payment, please wait...', 'info');

    console.log('👆 Manual confirmation triggered by user.');

    // Clear the automatic initial 10s timer
    if (this.initialWaitTimer) {
      clearTimeout(this.initialWaitTimer);
    }

    // Reset the UI countdown to 10 to show "Verification in progress"
    this.startUiCountdown(10);

    // Trigger the query immediately
    this.executeInitialQuery(this.currentCheckoutId);
  }

  startUiCountdown(seconds: number) {
    this.countdown = seconds;
    if (this.countdownTimer) clearInterval(this.countdownTimer);

    this.countdownTimer = setInterval(() => {
      if (this.countdown > 0) this.countdown--;
    }, 1000);
  }

  handleSuccess() {
    this.clearTimers();
    this.paymentStatus = 'SUCCESS';
    this.posthogService.posthog.capture('payment_completed', {
      method: 'mpesa',
      plan_id: this.plan.id,
      plan_name: this.plan.title,
      plan_price: this.plan.price,
      plan_currency: this.plan.currency,
    });

    const learnerData = localStorage.getItem('selectedLearner');
    let userId = localStorage.getItem('userId');

    if (!userId) {
      const userDetails = localStorage.getItem('userDetails');
      if (userDetails) userId = JSON.parse(userDetails).id;
    }

    if (learnerData && userId) {
      const learner = JSON.parse(learnerData);

      // ✅ 1. Instant unlock (UX)
      learner.subscriptionExpiryDate = new Date(Date.now() + 86400000).toISOString();
      localStorage.setItem('selectedLearner', JSON.stringify(learner));

      // 🔥 2. Refresh from backend (REAL DATA)
      this.learnerService.getLearnerByUserId(userId).subscribe({
        next: (learners: any[]) => {
          const updated = learners.find((l) => l.id === learner.id);
          if (updated) {
            localStorage.setItem('selectedLearner', JSON.stringify(updated));
          }
        },
        error: () => {
          console.warn('⚠️ Failed to refresh learner data after payment');
        },
      });
    }

    setTimeout(() => this.paymentComplete.emit(), 2500);
  }

  handleFailure(reason: string) {
    this.isVerifying = false;
    this.clearTimers();
    this.paymentStatus = 'FAILED';
    this.failureReason = reason; // Store the specific reason (e.g., 'INCORRECT-PIN')
    this.posthogService.posthog.capture('payment_failed', {
      method: 'mpesa',
      plan_id: this.plan.id,
      plan_name: this.plan.title,
      plan_price: this.plan.price,
      plan_currency: this.plan.currency,
    });
  }

  clearTimers() {
    if (this.pollingTimer && this.pollingTimer !== true) clearInterval(this.pollingTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.pollingTimer = undefined;
  }

  closeModal() {
    this.clearTimers();
    if (this.initialWaitTimer) clearTimeout(this.initialWaitTimer);
    this.paymentStatus = 'IDLE';
    this.showManualConfirm = false;
    this.failureReason = '';
  }
}
