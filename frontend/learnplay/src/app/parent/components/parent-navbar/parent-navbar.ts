import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { UserDataService } from '../../../services/user-data.service';
import { AnalyticsService } from '../../../services/analytics.service';
import { AuthService } from '../../../services/auth.service';
import { ParentModalService } from '../../services/parent-modal.service';
import { CameraStateService } from '../../../shared/services/camera-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-parent-navbar',
  imports: [CommonModule],
  templateUrl: './parent-navbar.html',
  styleUrl: './parent-navbar.css',
})
export class ParentNavbar implements OnInit, OnDestroy {
  private router = inject(Router);
  private userDataService = inject(UserDataService);
  private location = inject(Location);
  private analyticsService = inject(AnalyticsService);
  private authService = inject(AuthService);
  private parentModalService = inject(ParentModalService);
  private cameraStateService = inject(CameraStateService);
  userName = 'User';
  private userSub?: Subscription;
  private cameraSub?: Subscription;
  showNavGuide = false;
  isMobileGuide = false;
  switcherOpen = false;
  isCameraOpen = false;
  mobileMenuOpen = false;

  toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }

  toggleSwitcherDropdown() {
    this.switcherOpen = !this.switcherOpen;
  }

  get isOnMainDashboard(): boolean {
    return this.router.url === '/parent';
  }

  get isOnChildDetailsPage(): boolean {
    return this.router.url.includes('/parent/child/') || this.router.url.includes('/parent/recent-activities') || this.router.url.includes('/parent/edit-learner-profile');
  }

  ngOnInit() {
    this.userSub = this.userDataService.userDetails$.subscribe((details) => {
      const firstName = details?.firstName;
      const googleUser = localStorage.getItem('googleUser');
      if (firstName) {
        this.userName = firstName;
      } else if (googleUser) {
        const userInfo = JSON.parse(googleUser);
        this.userName = userInfo.given_name || userInfo.name || 'User';
      } else {
        this.userName = 'User';
      }
    });

    // Subscribe to camera state to hide bottom navigation when camera is open
    this.cameraSub = this.cameraStateService.cameraOpen$.subscribe((isOpen) => {
      this.isCameraOpen = isOpen;
    });

    this.updateScreenMode();
    
    // Only show tour guide on larger screens (not mobile)
    this.showNavGuide =
      this.router.url === '/parent' &&
      localStorage.getItem('parentNavGuidePending') === 'true' &&
      localStorage.getItem('parentNavGuideComplete') !== 'true' &&
      !this.isMobileGuide; // Added condition to prevent showing on mobile
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
    this.cameraSub?.unsubscribe();
  }

  get isChildDetailsPage(): boolean {
    return this.router.url.includes('/parent/select-learner');
  }

  get isHomePage(): boolean {
    return this.router.url === '/parent';
  }

  get isLearningPage(): boolean {
    return this.router.url.includes('/parent/select-learner');
  }

  get isActivitiesPage(): boolean {
    return this.router.url.includes('/parent/recent-activities');
  }

  get isAddLearnerPage(): boolean {
    return this.router.url.includes('/parent/add-child');
  }

  navOpen = false;
  toggleNav() { 
    this.analyticsService.trackButtonClick('mobile_nav_toggle', {
      source: 'parent_navbar',
      action: this.navOpen ? 'close' : 'open',
      current_page: this.router.url
    });
    this.navOpen = !this.navOpen; 
  }

  onLogoClick() { 
    this.analyticsService.trackButtonClick('logo_click', {
      source: 'parent_navbar',
      current_page: this.router.url,
      destination: '/parent'
    });
    this.router.navigate(['/parent']); 
  }
  
  onHomeClick() { 
    this.analyticsService.trackButtonClick('home_click', {
      source: 'parent_navbar',
      current_page: this.router.url,
      destination: '/parent'
    });
    this.router.navigate(['/parent']); 
  }
  
  onUserProfileClick() { 
    this.analyticsService.trackButtonClick('user_profile_click', {
      source: 'parent_navbar',
      current_page: this.router.url,
      destination: '/who-are-you'
    });
    this.router.navigate(['/who-are-you']); 
  }

  onLogout() {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/sign-up/sign-in']),
      error: () => this.router.navigate(['/sign-up/sign-in'])
    });
  }

  onGoToLearningClick() {
    // On child details page, go directly to learner dashboard
    if (this.isOnChildDetailsPage) {
      const storedChild = localStorage.getItem('selectedChild');
      if (storedChild) {
        const child = JSON.parse(storedChild);
        const storedLearners: any[] = JSON.parse(localStorage.getItem('learners') || '[]');
        const fullLearner = storedLearners.find((l: any) => l.id === child.id);
        if (fullLearner) {
          localStorage.setItem('selectedLearner', JSON.stringify(fullLearner));
        }
      }
      this.router.navigate(['/kid']);
      return;
    }
    this.analyticsService.trackButtonClick('go_to_learning_click', {
      source: 'parent_navbar',
      current_page: this.router.url,
      destination: '/parent/select-learner'
    });
    this.router.navigate(['/parent/select-learner']);
  }

  onRecentActivitiesClick() {
    const from = this.isOnChildDetailsPage ? 'parent' : 'parent';
    this.router.navigate(['/parent/recent-activities'], { queryParams: { from } });
  }

  onAddLearnerClick() {
    this.analyticsService.trackButtonClick('add_learner_click', {
      source: 'parent_navbar',
      current_page: this.router.url,
      destination: '/parent/add-child'
    });
    this.router.navigate(['/parent/add-child']);
  }

  onEditProfileClick() {
    this.analyticsService.trackButtonClick('edit_profile_click', {
      source: 'parent_navbar',
      current_page: this.router.url
    });
    this.parentModalService.openEditProfile();
  }

  onEditPhoneClick() {
    this.analyticsService.trackButtonClick('edit_phone_click', {
      source: 'parent_navbar',
      current_page: this.router.url
    });
    this.parentModalService.openEditPhone();
  }

  onChangePasswordClick() {
    this.analyticsService.trackButtonClick('change_password_click', {
      source: 'parent_navbar',
      current_page: this.router.url
    });
    this.parentModalService.openChangePassword();
  }

  onEditLearnerClick() {
    this.analyticsService.trackButtonClick('edit_learner_click', {
      source: 'parent_navbar',
      current_page: this.router.url
    });
    const storedChild = localStorage.getItem('selectedChild');
    if (!storedChild) return;
    const child = JSON.parse(storedChild);
    const storedLearners: any[] = JSON.parse(localStorage.getItem('learners') || '[]');
    const fullLearner = storedLearners.find((l: any) => l.id === child.id) || child;
    const learnerForEdit = {
      id: child.id,
      firstName: child.name?.split(' ')[0] || '',
      lastName: child.name?.split(' ').slice(1).join(' ') || '',
      preferredName: child.name || '',
      gender: child.gender || fullLearner.gender || 'MALE',
      avatar: child.avatar || fullLearner.avatar || '',
      ...fullLearner
    };
    localStorage.setItem('selectedLearnerId', child.id);
    localStorage.setItem('selectedLearnerForEdit', JSON.stringify(learnerForEdit));
    this.router.navigate(['/parent/edit-learner-profile'], { queryParams: { from: 'parent' } });
  }
  
  goBack() { 
    this.analyticsService.trackButtonClick('back_button', {
      source: 'parent_navbar',
      current_page: this.router.url
    });
    this.location.back(); 
  }

  dismissNavGuide() {
    this.analyticsService.trackButtonClick('nav_guide_dismissed', {
      source: 'parent_navbar',
      guide_type: 'navigation_guide'
    });
    this.showNavGuide = false;
    localStorage.setItem('parentNavGuideComplete', 'true');
    localStorage.removeItem('parentNavGuidePending');
    localStorage.setItem('parentGuideLaunchPending', 'true');
    window.dispatchEvent(new Event('parentNavGuideCompleted'));
  }

  skipAllGuides() {
    this.analyticsService.trackButtonClick('all_guides_skipped', {
      source: 'parent_navbar',
      guide_type: 'all_guides'
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

  trackMobileMenuAction(action: string) {
    this.analyticsService.trackButtonClick('mobile_menu_action', {
      source: 'parent_navbar_mobile',
      action: action,
      current_page: this.router.url
    });
  }
}
