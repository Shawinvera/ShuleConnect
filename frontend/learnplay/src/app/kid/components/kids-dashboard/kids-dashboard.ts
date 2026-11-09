import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { Navbar } from '../../reusable/navbar/navbar';
import { ChoosePlan } from '../../reusable/choose-plan/choose-plan';
import { PaymentMethod, Plan } from '../../reusable/payment-method/payment-method';
import { LearnerService } from '../../../kid/services/learner/learner';
import { filter } from 'rxjs/operators';
import { Subscription, interval } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { PosthogService } from '../../../services/posthog.service';
import { AnalyticsService } from '../../../services/analytics.service';

@Component({
  selector: 'app-kids-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    Navbar,
    RouterOutlet,
    // ChoosePlan,
    // PaymentMethod,
    MatIconModule,
  ],
  templateUrl: './kids-dashboard.html',
  styleUrls: ['./kids-dashboard.css'],
})
export class KidsDashboard implements OnInit, OnDestroy {
  // Flow State: 'plan-selection' | 'payment' | 'dashboard'
  currentStep: 'plan-selection' | 'payment' | 'dashboard' = 'dashboard';

  // Data to pass between components
  selectedPlan: Plan | null = null;

  private timerSub?: Subscription;
  now: number = Date.now();

  // Logic for dismissal
  isTimerDismissed = false;
  //lastThresholdReached: number = 0; // To track 24h, 2h, 1h, 30m marks
  lastThresholdReached: number = 9999999999;

  private subscriptionExpiredTracked = false;

  constructor(
    private learnerService: LearnerService,
    private router: Router,
    private posthogService: PosthogService,
    private analyticsService: AnalyticsService,
  ) {}

  ngOnInit() {
    // Track kid dashboard access
    const learnerData = localStorage.getItem('selectedLearner');
    const learner = learnerData ? JSON.parse(learnerData) : null;

    this.analyticsService.trackFeatureUsage('kid_dashboard_accessed', {
      learner_id: learner?.id,
      learner_name: learner?.firstName,
      subscription_active: learner
        ? this.learnerService.isSubscriptionActive(learner.subscriptionExpiryDate)
        : false,
    });

    // this.evaluateLearner();
    // // Re-evaluate every time we navigate back to /kid

    // this.learnerService.selectedLearner$.subscribe((learner) => {
    //   if (learner) {
    //     const active = this.learnerService.isSubscriptionActive(learner.subscriptionExpiryDate);
    //     // Only switch to plan-selection if truly expired
    //     this.currentStep = active ? 'dashboard' : 'plan-selection';

    //     // Track subscription status
    //     if (!active) {
    //       this.analyticsService.trackFeatureUsage('subscription_expired_view', {
    //         learner_id: learner.id,
    //         learner_name: learner.firstName
    //       });
    //     }
    //   } else {
    //     // No learner selected? Go to selection or plan
    //     this.currentStep = 'plan-selection';
    //   }
    // });

    this.timerSub = interval(1000).subscribe(() => {
      this.now = Date.now();
      // 3. CALLING THE THRESHOLD CHECK HERE (fixes the "never read" error)
      this.checkSubscriptionThresholds();
    });

    // this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
    //   this.evaluateLearner();
    // });
  }

  ngOnDestroy() {
    this.timerSub?.unsubscribe();
  }

  // Core logic to determine if the floating badge should be visible
  shouldShowTimer(): boolean {
    if (this.currentStep !== 'dashboard') return false;

    const diff = this.getTimeDiff();
    if (diff === null || diff <= 0 || diff > 86400000) return false;

    // Force show if less than 10 minutes (600,000 ms)
    if (diff <= 600000) return true;

    // Show if not dismissed
    return !this.isTimerDismissed;
  }

  private getTimeDiff(): number | null {
    const data = localStorage.getItem('selectedLearner');
    if (!data) return null;
    const learner = JSON.parse(data);
    if (!learner.subscriptionExpiryDate) return null;
    return new Date(learner.subscriptionExpiryDate).getTime() - this.now;
  }

  // Monitor thresholds to "re-show" the timer if it was dismissed
  private checkSubscriptionThresholds() {
    const diff = this.getTimeDiff();
    if (diff === null) return;

    // Auto-redirect if expired
    if (diff <= 0 && this.currentStep === 'dashboard') {
      console.log('Subscription expired. Redirecting...');
      if (!this.subscriptionExpiredTracked) {
        this.subscriptionExpiredTracked = true;
        const data = localStorage.getItem('selectedLearner');
        const learnerId = data ? JSON.parse(data).id : undefined;
        this.posthogService.posthog.capture('subscription_expired', {
          learner_id: learnerId,
        });
      }
      this.currentStep = 'plan-selection';
      return;
    }

    // Thresholds: 24h, 2h, 1h, 30m
    const thresholds = [86400000, 7200000, 3600000, 1800000];

    for (const t of thresholds) {
      // If we just crossed a threshold (e.g., from 1hr 1min to 59min)
      if (diff <= t && this.lastThresholdReached > t) {
        this.isTimerDismissed = false; // Reset dismissal so it pops up again
      }
    }
    this.lastThresholdReached = diff;
  }

  getCountdown(): string {
    const diff = Math.max(0, this.getTimeDiff() || 0);
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const minStr = minutes < 10 ? `0${minutes}` : minutes;
    const secStr = seconds < 10 ? `0${seconds}` : seconds;

    return `${hours}hr ${minStr}m ${secStr}s`;
  }

  dismissTimer(event: Event) {
    event.stopPropagation();

    // Track timer dismissal
    const learnerData = localStorage.getItem('selectedLearner');
    const learner = learnerData ? JSON.parse(learnerData) : null;
    const timeRemaining = this.getTimeDiff();

    this.analyticsService.trackButtonClick('subscription_timer_dismissed', {
      learner_id: learner?.id,
      time_remaining_ms: timeRemaining,
      time_remaining_readable: this.getCountdown(),
    });

    this.isTimerDismissed = true;
  }

  // Logic to calculate the countdown string
  // getCountdown(): string | null {
  //   const learnerData = localStorage.getItem('selectedLearner');
  //   if (!learnerData) return null;

  //   const learner = JSON.parse(learnerData);
  //   if (!learner.subscriptionExpiryDate) return null;

  //   const expiry = new Date(learner.subscriptionExpiryDate).getTime();
  //   const diff = expiry - this.now;

  //   // Only show countdown if time is remaining and it's less than 24 hours
  //   if (diff <= 0 || diff > 86400000) return null;

  //   const totalSeconds = Math.floor(diff / 1000);
  //   const hours = Math.floor(totalSeconds / 3600);
  //   const minutes = Math.floor((totalSeconds % 3600) / 60);
  //   const seconds = totalSeconds % 60;

  //   const minStr = minutes < 10 ? `0${minutes}` : minutes;
  //   const secStr = seconds < 10 ? `0${seconds}` : seconds;

  //   return `${hours}hr ${minStr}m ${secStr}s remaining`;
  // }

  // evaluateLearner() {
  //   const selectedLearnerStr = localStorage.getItem('selectedLearner');
  //   if (selectedLearnerStr) {
  //     const learner = JSON.parse(localStorage.getItem('selectedLearner') || '{}');
  //     const active = this.learnerService.isSubscriptionActive(learner.subscriptionExpiryDate);
  //     this.currentStep = active ? 'dashboard' : 'plan-selection';
  //     this.selectedPlan = null;
  //   }
  // }

  // evaluateLearner() {
  //   const data = localStorage.getItem('selectedLearner');
  //   if (data) {
  //     const learner = JSON.parse(data);
  //     const active = this.learnerService.isSubscriptionActive(learner.subscriptionExpiryDate);
  //     this.currentStep = active ? 'dashboard' : 'plan-selection';
  //   } else {
  //     this.currentStep = 'plan-selection';
  //   }
  // }

  // Called when user clicks "Choose Plan" in the first screen
  onPlanSelected(plan: Plan) {
    console.log('Plan received by Dashboard:', plan);

    // 1. Set the selectedPlan directly to the object we just received
    this.selectedPlan = plan;

    // 2. Now check if it exists and move to next step
    if (this.selectedPlan) {
      this.currentStep = 'payment';
      console.log('Moving to payment step...');
    } else {
      console.error('No plan was selected!');
    }
  }

  // Called when Payment is processed
  onPaymentSuccess() {
    console.log('Payment received. Unlocking dashboard...');
    this.currentStep = 'dashboard'; // Unlock the app
  }

  // Called if user wants to go back
  returnToPlans() {
    this.currentStep = 'plan-selection';
    this.selectedPlan = null;
  }
}
