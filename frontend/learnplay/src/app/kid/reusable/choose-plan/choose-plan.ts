import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import {
  SubscriptionTiers,
  SubscriptionTier,
} from '../../services/subscription-tiers/subscription-tiers';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../shared/services/toast.service';
import { PosthogService } from '../../../services/posthog.service';

interface Plan {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  currency: string;
  period: string;
  icon: string;
  iconBg: string;
  textColor?: string;
}

@Component({
  selector: 'app-choose-plan',
  standalone: true, // (Assuming standalone based on your imports array)
  imports: [CommonModule, MatIconModule, MatRippleModule, ToastNotificationComponent],
  templateUrl: './choose-plan.html',
  styleUrl: './choose-plan.css',
})
export class ChoosePlan implements OnInit {
  // 2. ADD THE OUTPUT EVENT EMITTER HERE
  @Output() planSelected = new EventEmitter<any>();

  plans: any[] = [];
  selectedPlanId: string | null = null;
  isLoading = true;
  loadError = false;

  constructor(
    private subService: SubscriptionTiers,
    public toast: ToastService,
    private posthogService: PosthogService,
  ) {}

  ngOnInit() {
    // Get courseId from the selected learner in storage
    const learnerData = localStorage.getItem('selectedLearner');
    if (learnerData) {
      const learner = JSON.parse(learnerData);
      // Use the ID from your Postman successful response
      const testCourseId = learner.courseId || 'course-1cf0984e-c26c-43f1-ac68-6e2759cabcdc';

      this.fetchPlans(testCourseId);
    }
  }

  fetchPlans(courseId: string) {
    this.subService.getTiersByCourse(courseId).subscribe({
      next: (tiers) => {
        //Sort the tiers by rankCode in ascending order
        const sortedTiers = tiers.sort((a, b) => {
          // If rankCode is missing, treat it as 0
          const rankA = a.rankCode || 0;
          const rankB = b.rankCode || 0;
          return rankA - rankB;
        });

        this.plans = sortedTiers.map((tier) => this.mapTierToUI(tier));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load plans', err);
        this.loadError = true;
        this.isLoading = false;
        this.toast.show("Couldn't load subscription plans. Please try again.", 'error');
      },
    });
  }

  private mapTierToUI(tier: SubscriptionTier) {
    // Logic to assign styles based on billingType from Java
    const uiConfigs: any = {
      HOURLY: {
        icon: 'assets/icons/clock.png',
        bg: 'bg-[linear-gradient(134.45deg,_#F8C96C_15.3%,_#FCA780_81.76%)]',
        text: 'text-[#9333EA]',
      },
      DAILY: {
        icon: 'assets/icons/calendar.png',
        bg: 'bg-[linear-gradient(134.45deg,_#3466EB_15.3%,_#98B4FF_81.76%)]',
        text: 'text-[#3466EB]',
      },
      WEEKLY: {
        icon: 'assets/icons/calendar.png',
        bg: 'bg-[linear-gradient(134.45deg,_#16A34A_15.3%,_#1FF46E_81.76%)]',
        text: 'text-[#16A34A]',
      },
      MONTHLY: {
        icon: 'assets/icons/calendar.png',
        bg: 'bg-[linear-gradient(90deg,_#C57CF0_0%,_#EA4C9F_100%)]',
        text: 'text-[#EA4C9F]',
      },
    };

    const config = uiConfigs[tier.billingType] || uiConfigs['MONTHLY'];

    return {
      id: tier.id,
      title: tier.name,
      subtitle: tier.description,
      price: tier.amount,
      currency: 'KES',
      period: `per ${tier.billingType.toLowerCase()}`,
      icon: config.icon,
      iconBg: config.bg,
      textColor: config.text,
    };
  }

  selectPlan(planId: string) {
    this.selectedPlanId = planId;

    // 2. Find the actual plan object from your dynamic 'this.plans' array
    const selectedPlanObject = this.plans.find((p) => p.id === planId);

    if (selectedPlanObject) {
      console.log('Emitting full plan object:', selectedPlanObject);
      this.posthogService.posthog.capture('plan_selected', {
        plan_id: selectedPlanObject.id,
        plan_name: selectedPlanObject.title,
        plan_price: selectedPlanObject.price,
        plan_currency: selectedPlanObject.currency,
        plan_period: selectedPlanObject.period,
      });
      // 3. Emit the WHOLE object, not just the ID string
      this.planSelected.emit(selectedPlanObject);
    }
  }
}
