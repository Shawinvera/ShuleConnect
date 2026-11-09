import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ParentApiService, CourseDto } from '../../services/parent-api.service';
import { LearnerService } from '../../../kid/services/learner/learner';
import { UserDataService } from '../../../services/user-data.service';
import { AvatarUtilService } from '../../../services/avatar-util.service';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../shared/services/toast.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-select-learner',
  standalone: true,
  imports: [CommonModule, SpinnerOverlayComponent, ToastNotificationComponent],
  templateUrl: './select-learner.html',
  styleUrl: './select-learner.css',
})
export class SelectLearner implements OnInit, OnDestroy {
  learners: any[] = [];
  courses: CourseDto[] = [];
  guardianName = '';
  isLoading = false;
  loadError = false;
  private userSub?: Subscription;
  showLearnerGuide = false;
  isMobileGuide = false; // Added mobile detection
  private timerSub?: Subscription;
  now: number = Date.now();

  constructor(
    private router: Router,
    private parentApiService: ParentApiService,
    private learnerService: LearnerService,
    private userDataService: UserDataService,
    private avatarUtilService: AvatarUtilService,
    public toast: ToastService,
  ) {}

  ngOnInit() {
    this.fetchCourses();
    this.loadLearners();
    this.userSub = this.userDataService.userDetails$.subscribe((details) => {
      this.guardianName = details?.firstName || 'Guardian';
      // Refresh the "now" timestamp every minute to update countdowns
      this.timerSub = interval(1000).subscribe(() => {
        this.now = Date.now();
      });
    });

    this.updateScreenMode();

    // Only show learner guide on larger screens (not mobile)
    this.showLearnerGuide =
      localStorage.getItem('selectLearnerGuidePending') === 'true' &&
      localStorage.getItem('selectLearnerGuideComplete') !== 'true' &&
      !this.isMobileGuide; // Added condition to prevent showing on mobile
  }

  fetchCourses() {
    this.parentApiService.fetchAllCourses().subscribe({
      next: (courses) => {
        this.courses = courses;
      },
      error: (err) => console.error('Error fetching courses', err),
    });
  }

  getCourseName(courseId: string): string {
    if (!courseId || this.courses.length === 0) return 'Loading Course...';
    const course = this.courses.find((c) => c.id === courseId);
    return course ? course.title : 'Unknown Course';
  }

  getCourseDisplay(courseId: string): string {
    if (!courseId || this.courses.length === 0) return '...';

    const course = this.courses.find((c) => c.id === courseId);
    if (!course) return '???';

    // 1. If shortCode exists and is not null/empty, use it
    if (course.shortCode && course.shortCode.trim()) {
      return course.shortCode.trim().toUpperCase();
    }

    // 2. Fallback: Generate abbreviation from title
    // Example: "Competence Based Learning" -> "C. B. L."
    return this.generateAbbreviation(course.title);
  }

  private generateAbbreviation(title: string): string {
    if (!title) return '';

    // Remove parentheses and their content (e.g., "(CBC)") to avoid double abbreviations
    const cleanTitle = title.replace(/\s*\(.*?\)\s*/g, ' ').trim();

    const words = cleanTitle.split(/\s+/);
    const abbreviation = words
      .map((word) => word.charAt(0).toUpperCase())
      .filter((char) => /[A-Z]/.test(char)) // Ensure it's a letter
      .join('. '); // Spaced and punctuated

    return abbreviation ? `${abbreviation}.` : title;
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
    this.timerSub?.unsubscribe();
  }

  // New method to calculate countdown
  getCountdown(expiryDate: string | null): string {
    if (!expiryDate) return 'No active plan';

    const expiry = new Date(expiryDate).getTime();
    const diff = expiry - this.now;

    if (diff <= 0) return 'Subscription Expired';

    // Calculate total units
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Logic: If 1 day or more remains
    if (days >= 1) {
      return `${days}d ${hours}h remaining`;
    }
    // Logic: If less than 24 hours remain, show seconds
    else {
      // Using padding for seconds to keep the string stable (e.g., 09 sec)
      const secStr = seconds < 10 ? `0${seconds}` : seconds;
      const minStr = minutes < 10 ? `0${minutes}` : minutes;

      return `${hours}hr ${minStr}mins ${secStr}sec`;
    }
  }

  loadLearners() {
    const userId = this.userDataService.getUserId();
    if (!userId) {
      this.toast.show('Something went wrong. Please sign in again.', 'error');
      setTimeout(() => this.router.navigate(['/sign-up/sign-in']), 2000);
      return;
    }

    this.isLoading = true;
    this.loadError = false;
    this.parentApiService.fetchLearnersByUserId(userId).subscribe({
      next: (learners) => {
        this.learners = learners;
        localStorage.setItem('learners', JSON.stringify(learners));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching learners:', error);
        const learnersData = localStorage.getItem('learners');
        if (learnersData) {
          this.learners = JSON.parse(learnersData);
          this.toast.show("Couldn't reach the server. Showing cached data.", 'warning');
        } else {
          this.loadError = true;
          this.toast.show(
            "Couldn't load learners. Please check your connection and try again.",
            'error',
          );
        }
        this.isLoading = false;
      },
    });
  }

  // Helper method to determine subscription status
  isSubscribed(expiryDate: string | null): boolean {
    return this.learnerService.isSubscriptionActive(expiryDate);
  }

  onSelectLearner(learner: any) {
    if (this.showLearnerGuide) {
      this.finishLearnerGuide();
    }

    // 1. UPDATE THE SERVICE (This notifies the Dashboard immediately)
    this.learnerService.updateSelectedLearner(learner);

    localStorage.setItem('selectedLearner', JSON.stringify(learner));
    if (!this.isSubscribed(learner.subscriptionExpiryDate)) {
      this.toast.show(
        `${this.getDisplayName(learner)}'s subscription is inactive. Please subscribe to continue.`,
        'warning',
        3000,
      );
    }
    localStorage.setItem('kidNavGuidePending', 'true');
    this.router.navigate(['/kid']);
  }

  onBack() {
    this.router.navigate(['/who-are-you']);
  }

  getAvatarPath(learner: any): string {
    return this.avatarUtilService.getLearnerAvatarPath(learner);
  }

  getDisplayName(learner: any): string {
    // Use preferred name if available, otherwise use first and last names
    return learner.preferredName && learner.preferredName.trim()
      ? learner.preferredName.trim()
      : `${learner.firstName} ${learner.lastName}`;
  }

  finishLearnerGuide() {
    this.showLearnerGuide = false;
    localStorage.setItem('selectLearnerGuideComplete', 'true');
    localStorage.removeItem('selectLearnerGuidePending');
    localStorage.setItem('kidNavGuidePending', 'true');
  }

  dismissLearnerGuide() {
    this.finishLearnerGuide();
  }

  skipAllGuides() {
    this.showLearnerGuide = false;
    localStorage.setItem('parentJourneyGuideComplete', 'true');
    localStorage.setItem('parentNavGuideComplete', 'true');
    localStorage.setItem('parentGuideTourComplete', 'true');
    localStorage.setItem('selectLearnerGuideComplete', 'true');
    localStorage.setItem('kidNavGuideComplete', 'true');
    localStorage.setItem('kidSubjectGuideComplete', 'true');
    localStorage.removeItem('parentNavGuidePending');
    localStorage.removeItem('parentGuideLaunchPending');
    localStorage.removeItem('selectLearnerGuidePending');
    localStorage.removeItem('kidNavGuidePending');
    localStorage.removeItem('kidSubjectGuidePending');
  }

  @HostListener('window:resize')
  onResize() {
    this.updateScreenMode();

    // Hide tour guide if screen becomes mobile-sized
    if (this.isMobileGuide && this.showLearnerGuide) {
      this.showLearnerGuide = false;
    }
  }

  private updateScreenMode() {
    this.isMobileGuide = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  }
}
