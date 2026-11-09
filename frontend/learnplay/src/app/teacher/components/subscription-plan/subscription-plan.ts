import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { TeacherBreadcrumbComponent } from '../breadcrumb/teacher-breadcrumb';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../shared/services/toast.service';

export interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  amount: number;
  billingType: string;
  courseId: string;
  status: number;
}

@Component({
  selector: 'app-subscription-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerOverlayComponent, TeacherBreadcrumbComponent, ToastNotificationComponent],
  templateUrl: './subscription-plan.html'
})
export class SubscriptionPlanComponent implements OnInit {
  showForm = false;
  courseId = '';
  tiers: SubscriptionTier[] = [];
  isLoading = false;
  errorMessage = '';

  form = {
    name: '',
    description: '',
    amount: null as number | null,
    billingType: ''
  };

  private baseUrl = environment.apiUrl;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: object,
    public toast: ToastService
  ) {}

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('courseId') ?? '';
    if (isPlatformBrowser(this.platformId)) {
      this.loadTiers();
    }
  }

  loadTiers() {
    this.isLoading = true;
    this.http.get<SubscriptionTier[]>(`${this.baseUrl}/public/subscription/tiers/${this.courseId}?status=1`, { withCredentials: true })
      .subscribe({
        next: (data) => { this.tiers = data; this.isLoading = false; },
        error: () => {
          this.isLoading = false;
          this.toast.show('Couldn\'t load subscription plans. Please try again.', 'error');
        }
      });
  }

  submitForm() {
    const payload = { ...this.form, courseId: this.courseId };
    console.log('Submitting payload:', JSON.stringify(payload));
    this.http.post<SubscriptionTier>(`${this.baseUrl}/subscription/tier`, payload, { withCredentials: true })
      .subscribe({
        next: (created) => {
          console.log('Created tier:', created);
          this.tiers.push(created);
          this.cancelForm();
          this.toast.show('Subscription plan created successfully!', 'success');
        },
        error: (err) => {
          console.error('Status:', err.status);
          this.errorMessage = '';
          this.toast.show(`Failed to create plan. ${err.error?.message || 'Please check your inputs and try again.'}`, 'error');
        }
      });
  }

  cancelForm() {
    this.showForm = false;
    this.errorMessage = '';
    this.form = { name: '', description: '', amount: null, billingType: '' };
  }

  goBack() {
    this.router.navigate(['/courses/dashboard', this.courseId]);
  }
}
