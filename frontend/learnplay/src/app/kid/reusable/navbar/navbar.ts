import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { LearnerService } from '../../services/learner/learner';
import { AvatarUtilService } from '../../../services/avatar-util.service';
import { AnalyticsService } from '../../../services/analytics.service';
import { AuthService } from '../../../services/auth.service';
import { LearnersSummary } from '../../services/learners-summary/learners-summary';
import { CameraStateService } from '../../../shared/services/camera-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [MatToolbarModule, CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit, OnDestroy {
  selectedLearner: any = null;
  userPoints = 0;
  showNavGuide = false;
  isMobileGuide = false;
  switcherOpen = false;
  isCameraOpen = false;
  mobileMenuOpen = false;
  private cameraSub?: Subscription;

  toggleSwitcherDropdown() {
    this.switcherOpen = !this.switcherOpen;
  }

  toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }

  constructor(
    private learnerService: LearnerService,
    private router: Router,
    private location: Location,
    private avatarUtilService: AvatarUtilService,
    private analyticsService: AnalyticsService,
    private authService: AuthService,
    private summaryService: LearnersSummary,
    private cameraStateService: CameraStateService,
  ) {}

  ngOnInit(): void {
    const selectedLearnerStr = localStorage.getItem('selectedLearner');
    if (selectedLearnerStr) {
      this.selectedLearner = JSON.parse(selectedLearnerStr);
      this.userPoints = this.selectedLearner.points || 0;
    }

    this.updateScreenMode();

    // Subscribe to camera state to hide bottom navigation when camera is open
    this.cameraSub = this.cameraStateService.cameraOpen$.subscribe((isOpen) => {
      this.isCameraOpen = isOpen;
    });

    // Only show nav guide on larger screens (not mobile)
    this.showNavGuide =
      localStorage.getItem('kidNavGuidePending') === 'true' &&
      localStorage.getItem('kidNavGuideComplete') !== 'true' &&
      !this.isMobileGuide; // Added condition to prevent showing on mobile

    this.learnerService.selectedLearner$.subscribe((learner) => {
      if (learner) {
        this.selectedLearner = learner;
        this.userPoints = learner.points || 0;
      }
    });

    // Load initial points from summary
    this.refreshTotalPoints();
  }

  ngOnDestroy() {
    this.cameraSub?.unsubscribe();
  }

  getAvatarPath(learner: any): string {
    return this.avatarUtilService.getLearnerAvatarPath(learner);
  }

  get isHomePage(): boolean {
    return this.router.url === '/kid' || this.router.url === '/kid/';
  }

  get isActivitiesPage(): boolean {
    return this.router.url.includes('/parent/recent-activities');
  }

  onRecentActivitiesClick() {
    this.router.navigate(['/parent/recent-activities'], { queryParams: { from: 'kid' } });
  }

  navOpen = false;
  toggleNav() {
    this.analyticsService.trackButtonClick('mobile_nav_toggle', {
      source: 'kid_navbar',
      action: this.navOpen ? 'close' : 'open',
      current_page: this.router.url,
      learner_id: this.selectedLearner?.id,
      learner_name: this.selectedLearner?.firstName
    });
    this.navOpen = !this.navOpen;
  }

  goBack() {
    this.analyticsService.trackButtonClick('back_button', {
      source: 'kid_navbar',
      current_page: this.router.url,
      learner_id: this.selectedLearner?.id
    });
    this.location.back();
  }

  onHomeClick() {
    this.analyticsService.trackButtonClick('home_click', {
      source: 'kid_navbar',
      current_page: this.router.url,
      destination: '/kid',
      learner_id: this.selectedLearner?.id,
      learner_name: this.selectedLearner?.firstName
    });
    this.router.navigate(['/kid']);
  }

  onLogout() {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/sign-up/sign-in']),
      error: () => this.router.navigate(['/sign-up/sign-in'])
    });
  }

  onEditLearnerClick() {
    if (!this.selectedLearner?.id) return;
    const storedLearners: any[] = JSON.parse(localStorage.getItem('learners') || '[]');
    const fullLearner = storedLearners.find((l: any) => l.id === this.selectedLearner.id) || this.selectedLearner;
    const learnerForEdit = {
      id: this.selectedLearner.id,
      firstName: this.selectedLearner.firstName || '',
      lastName: this.selectedLearner.lastName || '',
      preferredName: this.selectedLearner.preferredName || this.selectedLearner.firstName || '',
      gender: this.selectedLearner.gender || fullLearner.gender || 'MALE',
      avatar: this.selectedLearner.avatar || fullLearner.avatar || '',
      ...fullLearner
    };
    localStorage.setItem('selectedLearnerId', this.selectedLearner.id);
    localStorage.setItem('selectedLearnerForEdit', JSON.stringify(learnerForEdit));
    this.router.navigate(['/parent/edit-learner-profile'], { queryParams: { from: 'kid' } });
  }

  onWhoAreYouClick() {
    this.analyticsService.trackButtonClick('who_are_you_click', {
      source: 'kid_navbar',
      current_page: this.router.url,
      destination: '/who-are-you',
      learner_id: this.selectedLearner?.id
    });
    this.router.navigate(['/who-are-you']);
  }

  onParentDashboardClick() {
    this.analyticsService.trackButtonClick('parent_dashboard_click', {
      source: 'kid_navbar',
      current_page: this.router.url,
      destination: '/parent',
      learner_id: this.selectedLearner?.id
    });
    this.router.navigate(['/parent']);
  }

  onSelectLearnerClick() {
    this.analyticsService.trackButtonClick('select_learner_click', {
      source: 'kid_navbar',
      current_page: this.router.url,
      destination: '/parent/select-learner',
      current_learner_id: this.selectedLearner?.id,
      current_learner_name: this.selectedLearner?.firstName
    });
    this.router.navigate(['/parent/select-learner']);
  }

  dismissNavGuide() {
    this.analyticsService.trackButtonClick('nav_guide_dismissed', {
      source: 'kid_navbar',
      guide_type: 'navigation_guide',
      learner_id: this.selectedLearner?.id
    });
    this.showNavGuide = false;
    localStorage.setItem('kidNavGuideComplete', 'true');
    localStorage.removeItem('kidNavGuidePending');
    localStorage.setItem('kidSubjectGuidePending', 'true');
    window.dispatchEvent(new Event('kidNavGuideCompleted'));
  }

  skipAllGuides() {
    this.analyticsService.trackButtonClick('all_guides_skipped', {
      source: 'kid_navbar',
      guide_type: 'all_guides',
      learner_id: this.selectedLearner?.id
    });
    this.showNavGuide = false;
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
    if (this.isMobileGuide && this.showNavGuide) {
      this.showNavGuide = false;
    }
  }

  private updateScreenMode() {
    this.isMobileGuide = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  }

  /**
   * Refreshes the total points for the current learner
   */
  refreshTotalPoints() {
    if (!this.selectedLearner?.id) {
      return;
    }

    this.summaryService.getLearnerLessonSummary(this.selectedLearner.id).subscribe({
      next: (summary) => {
        // Use the total points from the summary if available, otherwise calculate from subjects
        const totalPoints = summary.points || 
          summary.subjects?.reduce((total, subject) => {
            return total + (subject.points || 0);
          }, 0) || 0;

        console.log('Navbar: Updated total points from', this.userPoints, 'to', totalPoints);
        this.userPoints = totalPoints;

        // Update the selectedLearner object in localStorage with new points
        if (this.selectedLearner) {
          this.selectedLearner.points = totalPoints;
          localStorage.setItem('selectedLearner', JSON.stringify(this.selectedLearner));
        }
      },
      error: (err) => {
        console.error('Failed to refresh total points in navbar:', err);
      },
    });
  }

  // Listen for lesson completion events to update points in real-time
  @HostListener('window:lessonCompleted', ['$event'])
  onLessonCompleted(event: Event) {
    const customEvent = event as CustomEvent;
    console.log('Navbar: Lesson completed event received:', customEvent.detail);
    // Small delay to ensure backend has processed the completion
    setTimeout(() => {
      this.refreshTotalPoints();
    }, 500);
  }

  trackMobileMenuAction(action: string) {
    this.analyticsService.trackButtonClick('mobile_menu_action', {
      source: 'kid_navbar_mobile',
      action: action,
      current_page: this.router.url,
      learner_id: this.selectedLearner?.id,
      learner_name: this.selectedLearner?.firstName
    });
  }

}