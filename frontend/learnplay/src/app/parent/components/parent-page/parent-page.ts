import { Component, OnInit, Inject, PLATFORM_ID, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ParentApiService, LearnerDto } from '../../services/parent-api.service';
import { LearnerTrackerSummaryDto } from '../../../models/learner-tracker-summary.interface';
import { LearnerService } from '../../../kid/services/learner/learner';
import { UserDataService } from '../../../services/user-data.service';
import { AuthService } from '../../../services/auth.service';
import { AvatarUtilService } from '../../../services/avatar-util.service';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../shared/services/toast.service';
import { LearnerProfileModal } from '../learner-profile-modal/learner-profile-modal';
import { PhoneInputComponent } from '../../../shared/components/phone-input/phone-input';
import { ParentModalService } from '../../services/parent-modal.service';
import { forkJoin, Subscription, interval } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CountryCodeService } from '../../../shared/services/country-code.service';
import { CountryCode } from '../../../shared/data/country-codes';
import { AnalyticsService } from '../../../services/analytics.service';

interface Child {
  id: string;
  name: string;
  age: number;
  gradeName: string;
  courseName: string;
  progress: number;
  totalPoints: number;
  activeSubjects: number;
  avatar: string;
  gender: string;
  gradeId: string;
  courseId: string;
  subscriptionExpiryDate: string | null;
}

@Component({
  selector: 'app-parent-page',
  imports: [CommonModule, MatIconModule, FormsModule, SpinnerOverlayComponent, ToastNotificationComponent, LearnerProfileModal, PhoneInputComponent],
  templateUrl: './parent-page.html',
  styleUrl: './parent-page.css',
})
export class ParentPage implements OnInit, OnDestroy {
  children: Child[] = [];
  isLoading = false;
  errorMessage = '';
  private routerSubscription?: Subscription;
  private modalSubscriptions: Subscription[] = [];
  showProfileModal = false;
  showPhoneModal = false;
  showPasswordModal = false;
  showSettingsMenu = false;
  showLearnerProfileModal = false; // Added learner profile modal state
  selectedLearnerForEdit: any = null; // Added selected learner for editing
  isSavingProfile = false;
  isSavingPhone = false;
  isSavingPassword = false;
  guideStep = -1;
  isMobileGuide = false;
  now: number = Date.now();
  private timerSub?: Subscription;
  countryDropdownOpen = false;
  countrySearch = '';
  countries: CountryCode[] = [];
  filteredCountries: CountryCode[] = [];
  selectedCountry: CountryCode | null = null;
  profileForm = {
    id: '',
    firstName: '',
    lastName: '',
    countryCode: '',
    userTimezone: '',
    role: '',
  };
  phoneForm = {
    phoneNumber: '',
    fullPhone: '',
    isValid: false,
  };
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    newPasswordConfirmation: '',
  };
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  get newPasswordRules() {
    return { minLength: this.passwordForm.newPassword.length >= 6 };
  }
  get newPasswordValid(): boolean {
    return Object.values(this.newPasswordRules).every(Boolean);
  }
  get passwordsMatch(): boolean {
    return this.passwordForm.newPasswordConfirmation.length > 0 &&
      this.passwordForm.newPassword === this.passwordForm.newPasswordConfirmation;
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private parentApiService: ParentApiService,
    private learnerService: LearnerService,
    private userDataService: UserDataService,
    private authService: AuthService,
    private avatarUtilService: AvatarUtilService,
    private countryCodeService: CountryCodeService,
    private parentModalService: ParentModalService,
    public toast: ToastService,
    private analyticsService: AnalyticsService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  isSubscribed(expiryDate: string | null): boolean {
    return this.learnerService.isSubscriptionActive(expiryDate);
  }

  ngOnInit() {
    this.loadProfileFromStorage();
    this.loadCountryCodes();
    this.updateScreenMode();

    this.timerSub = interval(1000).subscribe(() => { this.now = Date.now(); });

    // Subscribe to modal service events
    this.modalSubscriptions.push(
      this.parentModalService.editProfile$.subscribe(() => this.openProfileModal()),
      this.parentModalService.editPhone$.subscribe(() => this.openPhoneModal()),
      this.parentModalService.changePassword$.subscribe(() => this.openPasswordModal())
    );

    // Subscribe to user data changes to keep phone form in sync
    this.userDataService.userDetails$.subscribe((userDetails) => {
      if (userDetails && this.showPhoneModal) {
        // If phone modal is open, update the form with fresh data
        this.phoneForm.phoneNumber = userDetails.phoneNumber || '';
        console.log('🔵 [PARENT PAGE] User details updated, refreshing phone form:', this.phoneForm.phoneNumber);
      }
    });

    // Check if we should refresh data (coming back from add-child)
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['refresh']) {
      console.log('Refresh requested via navigation state');
      setTimeout(() => this.fetchChildren(), 100);
    } else {
      this.fetchChildren();
    }

    const shouldLaunchGuide = localStorage.getItem('parentGuideLaunchPending') === 'true';
    const alreadyDone = localStorage.getItem('parentGuideTourComplete') === 'true';
    const navGuidePending = localStorage.getItem('parentNavGuidePending') === 'true';
    // Only show guide on larger screens (not mobile)
    if (shouldLaunchGuide && !alreadyDone && !navGuidePending && !this.isMobileGuide) {
      this.guideStep = 0;
      localStorage.removeItem('parentGuideLaunchPending');
    }
  }

  ngOnDestroy() {
    if (this.routerSubscription) this.routerSubscription.unsubscribe();
    this.timerSub?.unsubscribe();
    this.modalSubscriptions.forEach(sub => sub.unsubscribe());
  }

  // Force refresh data (can be called when returning from add-child)
  refreshData() {
    console.log('Force refreshing parent dashboard data...');
    this.fetchChildren();
  }

  fetchChildren() {
    this.isLoading = true;
    this.errorMessage = '';

    const userId = this.userDataService.getUserId();

    if (!userId) {
      this.analyticsService.trackError('user_id_missing', 'No user ID found in storage', {
        source: 'parent_dashboard'
      });
      this.isLoading = false;
      this.toast.show('Something went wrong. Please sign in again.', 'error');
      setTimeout(() => this.router.navigate(['/sign-up/sign-in']), 2000);
      return;
    }

    const startTime = Date.now();

    // Fetch both learners and courses data
    forkJoin({
      learners: this.parentApiService.fetchLearnersByUserId(userId),
      courses: this.parentApiService.fetchAllCourses()
    }).subscribe({
      next: ({ learners, courses }) => {
        const responseTime = Date.now() - startTime;
        
        // Track successful API calls
        this.analyticsService.trackApiCall('fetchLearnersByUserId', 'GET', true, responseTime, {
          learners_count: learners?.length || 0
        });
        this.analyticsService.trackApiCall('fetchAllCourses', 'GET', true, responseTime, {
          courses_count: courses?.length || 0
        });

        console.log('Fetched fresh learners from API:', learners);
        console.log('Fetched courses from API:', courses);

        // If no learners, set loading to false and return
        if (!learners || learners.length === 0) {
          this.children = [];
          this.isLoading = false;
          this.analyticsService.trackSuccess('parent_dashboard_loaded', {
            children_count: 0,
            load_time_ms: responseTime
          });
          return;
        }

        // Update localStorage with fresh data
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('learners', JSON.stringify(learners));
        }

        // Create a map of course IDs to course names for quick lookup
        const courseMap = courses.reduce((map, course) => {
          map[course.id] = course.title;
          return map;
        }, {} as { [key: string]: string });

        // Create array of observables for learner summaries
        const summaryRequests = learners.map((learner: LearnerDto) =>
          this.parentApiService.getLearnerSummary(learner.id!)
        );

        // Fetch all learner summaries in parallel
        forkJoin<LearnerTrackerSummaryDto[]>(summaryRequests).subscribe({
          next: (summaries: LearnerTrackerSummaryDto[]) => {
            this.children = learners.map((learner: LearnerDto, index: number) => {
              const summary = summaries[index];
              // Use preferred name if available, otherwise use first and last names
              const displayName = learner.preferredName && learner.preferredName.trim()
                ? learner.preferredName.trim()
                : `${learner.firstName} ${learner.lastName}`;

              return {
                id: learner.id!,
                name: displayName,
                age: this.calculateAge(learner.dob),
                gradeName: this.formatGradeName(learner.gradeName),
                courseName: courseMap[(learner as any).courseId] || 'Unknown Course',
                progress: Math.round(summary?.percentageCompleted || 0),
                totalPoints: summary?.points ? summary.points : 0,
                activeSubjects: summary?.subjects?.length || 0,
                avatar: learner.avatar || 'brown_boy.png',
                gender: learner.gender,
                gradeId: learner.gradeId,
                courseId: (learner as any).courseId || '',
                subscriptionExpiryDate: (learner as any).subscriptionExpiryDate
              };
            });

            this.analyticsService.trackSuccess('parent_dashboard_loaded', {
              children_count: this.children.length,
              load_time_ms: Date.now() - startTime,
              has_progress_data: summaries.some(s => s?.percentageCompleted > 0)
            });

            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error fetching learner summaries:', error);
            this.analyticsService.trackError('learner_summaries_failed', error.message || 'Unknown error', {
              learners_count: learners.length,
              error_status: error.status,
              user_id: userId
            });
            this.toast.show('Some data couldn\'t be loaded. Showing partial information.', 'warning');
            // Fallback to basic learner data without progress
            this.children = learners.map((learner: LearnerDto) => {
              // Use preferred name if available, otherwise use first and last names
              const displayName = learner.preferredName && learner.preferredName.trim()
                ? learner.preferredName.trim()
                : `${learner.firstName} ${learner.lastName}`;

              return {
                id: learner.id!,
                name: displayName,
                age: this.calculateAge(learner.dob),
                gradeName: this.formatGradeName(learner.gradeName),
                courseName: courseMap[(learner as any).courseId] || 'Unknown Course',
                progress: 0,
                totalPoints: 0,
                activeSubjects: 0,
                avatar: learner.avatar || 'brown_boy.png',
                gender: learner.gender,
                gradeId: learner.gradeId,
                courseId: (learner as any).courseId || '',
                subscriptionExpiryDate: (learner as any).subscriptionExpiryDate
              };
            });

            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error fetching data:', error);
        const responseTime = Date.now() - startTime;
        
        this.analyticsService.trackError('parent_dashboard_api_failed', error.message || 'Unknown error', {
          error_status: error.status,
          user_id: userId,
          response_time_ms: responseTime
        });

        if (error.status === 404 || error.status === 204) {
          this.children = [];
          this.isLoading = false;
        } else {
          this.toast.show('Couldn\'t load learners. Please check your connection and try again.', 'error');
          this.errorMessage = 'Failed to load learners. Please try again.';
          this.isLoading = false;
        }
      }
    });
  }

  calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  formatGradeName(gradeName: string | undefined): string {
    if (!gradeName) return '';

    // Convert "GRADE 8" to "Grade 8"
    return gradeName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  formatCourseName(courseName: string): string {
    if (!courseName) return '';

    // Split by parentheses to handle text inside brackets separately
    const parts = courseName.split(/(\([^)]*\))/);
    
    return parts.map(part => {
      if (part.startsWith('(') && part.endsWith(')')) {
        // Keep text inside parentheses uppercase
        return part.toUpperCase();
      } else {
        // For text outside parentheses: lowercase everything, then capitalize first letter of each word
        return part.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
      }
    }).join('');
  }

  getCountdown(expiryDate: string | null): string {
    if (!expiryDate) return 'No active plan';
    const diff = new Date(expiryDate).getTime() - this.now;
    if (diff <= 0) return 'Subscription Expired';
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (days >= 1) return `${days}d ${hours}h remaining`;
    const s = seconds < 10 ? `0${seconds}` : `${seconds}`;
    const m = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}hr ${m}mins ${s}sec`;
  }

  onChildClick(child: Child) {
    // Track child selection
    this.analyticsService.trackChildSelection(child.id, child.name);
    
    // Only access localStorage in browser
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('selectedChild', JSON.stringify(child));
    }
    this.router.navigate(['child', child.id], { relativeTo: this.route });
  }

  onAddChild() {
    this.analyticsService.trackButtonClick('add_learner', {
      source: 'parent_dashboard',
      existing_learners_count: this.children.length
    });
    this.router.navigate(['add-child'], { relativeTo: this.route });
  }

  onLogout() {
    this.analyticsService.trackButtonClick('logout', {
      source: 'parent_dashboard_settings'
    });
    
    console.log('🔵 [PARENT PAGE] Logout button clicked');

    this.authService.logout().subscribe({
      next: (response) => {
        console.log('🟢 [PARENT PAGE] Logout successful:', response);
        this.toast.show('Logged out successfully. See you soon!', 'success', 2000);
        setTimeout(() => this.router.navigate(['/sign-up/sign-in']), 1500);
      },
      error: (error) => {
        console.error('🔴 [PARENT PAGE] Logout failed:', error);
        this.toast.show('Logout failed. Please try again.', 'error');
      }
    });
  }

  onBackToWhoAreYou() {
    this.router.navigate(['/who-are-you']);
  }

  getAvatarPath(child: Child): string {
    return this.avatarUtilService.getLearnerAvatarPath(child);
  }

  openProfileModal() {
    this.analyticsService.trackButtonClick('edit_profile', {
      source: 'parent_dashboard_settings'
    });
    this.countryDropdownOpen = false;
    this.loadProfileFromStorage();
    this.showProfileModal = true;
  }

  openPhoneModal() {
    this.analyticsService.trackButtonClick('edit_phone', {
      source: 'parent_dashboard_settings'
    });
    console.log('🔵 [PARENT PAGE] Opening phone modal, loading fresh data...');
    // Load the latest data from cache (which should be fresh from the last update)
    this.loadPhoneFromStorage();
    this.showPhoneModal = true;
  }

  openPasswordModal() {
    this.passwordForm = { currentPassword: '', newPassword: '', newPasswordConfirmation: '' };
    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
    this.showPasswordModal = true;
  }

  closePasswordModal() {
    if (this.isSavingPassword) return;
    this.showPasswordModal = false;
  }

  savePassword() {
    if (this.isSavingPassword) return;
    if (!this.passwordForm.currentPassword.trim()) {
      this.toast.show('Current password is required.', 'warning'); return;
    }
    if (!this.newPasswordValid) {
      this.toast.show('New password must be at least 6 characters.', 'warning'); return;
    }
    if (!this.passwordsMatch) {
      this.toast.show('New passwords do not match.', 'warning'); return;
    }
    this.isSavingPassword = true;
    this.authService.resetPassword({
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword,
      newPasswordConfirmation: this.passwordForm.newPasswordConfirmation,
    }).subscribe({
      next: () => {
        this.isSavingPassword = false;
        this.showPasswordModal = false;
        this.toast.show('Password updated successfully!', 'success');
      },
      error: (error) => {
        this.isSavingPassword = false;
        let message = 'Failed to update password. Please try again.';
        try {
          const body = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
          if (body?.errorMessage === 'Invalid credentials') {
            message = 'Current password is incorrect. Please try again.';
          } else if (body?.errorMessage) {
            message = body.errorMessage;
          }
        } catch {}
        this.toast.show(message, 'error');
      },
    });
  }

  nextGuideStep() {
    this.finishGuide();
  }

  skipGuide() {
    this.skipAllGuides();
  }

  private finishGuide() {
    this.guideStep = -1;
    localStorage.setItem('parentGuideTourComplete', 'true');
  }

  private skipAllGuides() {
    this.guideStep = -1;
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

  closeProfileModal() {
    if (this.isSavingProfile) return;
    this.countryDropdownOpen = false;
    this.showProfileModal = false;
  }

  closePhoneModal() {
    if (this.isSavingPhone) return;
    this.showPhoneModal = false;
  }

  saveProfile() {
    if (this.isSavingProfile) return;

    if (!this.profileForm.id) {
      this.toast.show('Could not identify your account. Please sign in again.', 'error');
      return;
    }

    if (!this.profileForm.firstName.trim() || !this.profileForm.lastName.trim()) {
      this.toast.show('First name and last name are required.', 'warning');
      return;
    }

    this.isSavingProfile = true;
    this.authService.updateUserProfile({
      id: this.profileForm.id,
      firstName: this.profileForm.firstName.trim(),
      lastName: this.profileForm.lastName.trim(),
      countryCode: this.profileForm.countryCode.trim(),
      userTimezone: this.profileForm.userTimezone.trim(),
      role: this.profileForm.role,
    }).subscribe({
      next: () => {
        this.analyticsService.trackFormSubmission('profile_update', true, {
          fields_updated: ['firstName', 'lastName', 'countryCode', 'userTimezone']
        });
        this.isSavingProfile = false;
        this.loadProfileFromStorage();
        this.showProfileModal = false;
        this.toast.show('Profile updated successfully!', 'success');
      },
      error: (error) => {
        this.analyticsService.trackFormSubmission('profile_update', false, {
          error_message: error?.error?.errorMessage || 'Unknown error'
        });
        this.isSavingProfile = false;
        const message = error?.error?.errorMessage || 'Failed to update profile. Please try again.';
        this.toast.show(message, 'error');
      },
    });
  }

  savePhoneNumber() {
    if (this.isSavingPhone) return;

    const user = this.userDataService.getUserDetails();
    if (!user?.id) {
      this.toast.show('Could not identify your account. Please sign in again.', 'error');
      return;
    }

    if (!this.phoneForm.fullPhone.trim() || !this.phoneForm.isValid) {
      this.toast.show('Please enter a valid phone number (9 or 10 digits).', 'warning');
      return;
    }

    console.log('🔵 [PARENT PAGE] Saving phone number:', this.phoneForm.fullPhone.trim());
    this.isSavingPhone = true;

    // Use the dedicated phone number update endpoint
    this.authService.updatePhoneNumber({
      id: user.id,
      phoneNumber: this.phoneForm.fullPhone.trim(),
    }).subscribe({
      next: (response) => {
        console.log('🟢 [PARENT PAGE] Phone number update successful, response:', response);
        console.log('🟢 [PARENT PAGE] Response type:', typeof response);
        console.log('🟢 [PARENT PAGE] Response keys:', Object.keys(response || {}));

        // Check if the response contains the updated phone number
        if (response && response.phoneNumber) {
          console.log('🟢 [PARENT PAGE] Updated phone number in response:', response.phoneNumber);
        } else {
          console.log('⚠️ [PARENT PAGE] No phoneNumber in response, full response:', response);
        }

        this.isSavingPhone = false;
        this.showPhoneModal = false;
        this.toast.show('Phone number updated successfully!', 'success');

        // Refresh user data to get the updated phone number
        this.authService.getUserDetails().subscribe();
      },
      error: (error) => {
        console.error('🔴 [PARENT PAGE] Phone number update failed:', error);
        this.isSavingPhone = false;
        const message = error?.error?.errorMessage || 'Failed to update phone number. Please try again.';
        this.toast.show(message, 'error');
      },
    });
  }

  private loadProfileFromStorage() {
    const user = this.userDataService.getUserDetails() || {};
    this.profileForm = {
      id: user.id || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      countryCode: user.countryCode || '',
      userTimezone: user.userTimezone || '',
      role: user.role || '',
    };
    this.syncSelectedCountryFromProfile();
  }

  private loadPhoneFromStorage() {
    const user = this.userDataService.getUserDetails() || {};
    console.log('🔵 [PARENT PAGE] Loading phone from storage, user data:', user);
    console.log('🔵 [PARENT PAGE] Phone number from user data:', user.phoneNumber);
    this.phoneForm = {
      phoneNumber: user.phoneNumber || '',
      fullPhone: user.phoneNumber || '',
      isValid: !!(user.phoneNumber),
    };
    console.log('🔵 [PARENT PAGE] Phone form after loading:', this.phoneForm);
  }

  private loadCountryCodes() {
    this.countryCodeService.getCodes().subscribe((codes) => {
      this.countries = codes;
      this.filteredCountries = codes;
      this.syncSelectedCountryFromProfile();
    });
  }

  private syncSelectedCountryFromProfile() {
    if (!this.countries.length) return;
    const profileCode = (this.profileForm.countryCode || '').trim();

    // If no countryCode stored, try to derive it from the phone number
    const user = this.userDataService.getUserDetails() || {};
    const phone: string = user.phoneNumber || user.username || '';

    let match: CountryCode | undefined;

    if (profileCode) {
      match =
        this.countries.find(c => c.iso.toUpperCase() === profileCode.toUpperCase()) ||
        this.countries.find(c => c.code === profileCode);
    }

    if (!match && phone) {
      const sorted = [...this.countries].sort((a, b) => b.code.length - a.code.length);
      match = sorted.find(c => phone.startsWith(c.code));
    }

    this.selectedCountry = match || null;
    if (this.selectedCountry) {
      this.profileForm.countryCode = this.selectedCountry.iso;
    }
  }

  toggleCountryDropdown(event?: MouseEvent) {
    event?.stopPropagation();
    this.countryDropdownOpen = !this.countryDropdownOpen;
    if (this.countryDropdownOpen) {
      this.countrySearch = '';
      this.filteredCountries = this.countries;
    }
  }

  filterCountries() {
    const q = this.countrySearch.toLowerCase().trim();
    this.filteredCountries = this.countries.filter((c) =>
      c.iso.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }

  selectCountry(country: CountryCode) {
    this.selectedCountry = country;
    this.profileForm.countryCode = country.iso;
    this.countryDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.country-code-wrapper')) {
      this.countryDropdownOpen = false;
    }
  }

  @HostListener('window:parentNavGuideCompleted')
  onParentNavGuideCompleted() {
    const shouldLaunchGuide = localStorage.getItem('parentGuideLaunchPending') === 'true';
    const alreadyDone = localStorage.getItem('parentGuideTourComplete') === 'true';
    // Only show guide on larger screens (not mobile)
    if (shouldLaunchGuide && !alreadyDone && !this.isMobileGuide) {
      this.guideStep = 0;
      localStorage.removeItem('parentGuideLaunchPending');
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.updateScreenMode();
    
    // Hide tour guide if screen becomes mobile-sized
    if (this.isMobileGuide && this.guideStep >= 0) {
      this.guideStep = -1;
    }
  }

  private updateScreenMode() {
    this.isMobileGuide = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  }

  // Learner Profile Modal Methods
  openLearnerProfileModal(child: Child, event: MouseEvent) {
    event.stopPropagation(); // Prevent child card click
    
    this.analyticsService.trackButtonClick('edit_child_profile', {
      source: 'parent_dashboard_child_card',
      child_id: child.id,
      child_name: child.name
    });
    
    this.selectedLearnerForEdit = child;
    this.showLearnerProfileModal = true;
  }

  closeLearnerProfileModal() {
    this.showLearnerProfileModal = false;
    this.selectedLearnerForEdit = null;
  }

  onLearnerProfileUpdated(updatedLearner: any) {
    // Refresh the children list to show updated data
    this.fetchChildren();
    this.toast.show(`${updatedLearner.firstName}'s profile updated successfully!`, 'success');
  }
}
