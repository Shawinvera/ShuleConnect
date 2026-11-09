import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserRoleService } from '../../../sign-up/services/user-role.service';
import { UserDataService } from '../../../services/user-data.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-who-are-you',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './who-are-you.html',
  styleUrl: './who-are-you.css'
})
export class WhoAreYouComponent implements OnInit {
  isLoggedIn = false;
  showOnlyGuardianAndLearner = false;
  showRoleGuide = false;
  roleGuideStep = 0;
  isMobileGuide = false; // Added mobile detection

  constructor(
    private router: Router,
    private userRoleService: UserRoleService,
    private userDataService: UserDataService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.updateScreenMode();
    
    // If on mobile, automatically mark all guides as complete to prevent them from showing
    if (this.isMobileGuide) {
      this.skipAllGuidesOnMobile();
    }
    
    const userRole = this.userDataService.getUserRole();
    if (userRole) {
      this.applyRole(userRole);
      this.authService.scheduleRefresh();
    } else {
      this.authService.getUserDetails().subscribe({
        next: (userData: any) => {
          this.applyRole(userData?.role);
          this.authService.scheduleRefresh();
        },
        error: () => {}
      });
    }
  }

  private applyRole(role: string) {
    if (role === 'GUARDIAN') {
      this.isLoggedIn = true;
      this.showOnlyGuardianAndLearner = true;
      // Only show role guide on larger screens (not mobile)
      this.showRoleGuide = localStorage.getItem('parentJourneyGuideComplete') !== 'true' && !this.isMobileGuide;
      this.roleGuideStep = 0;
      
      // Check if user has learners - if not, redirect to add-child
      this.checkUserLearners();
    } else {
      this.isLoggedIn = false;
      this.showOnlyGuardianAndLearner = false;
      this.showRoleGuide = false;
    }
  }

  private checkUserLearners() {
    const userId = this.userDataService.getUserId();
    if (!userId) return;

    // Check localStorage first for cached learners
    const cachedLearners = localStorage.getItem('learners');
    if (cachedLearners) {
      try {
        const learners = JSON.parse(cachedLearners);
        if (!learners || learners.length === 0) {
          // No learners found, redirect to add-child
          this.router.navigate(['/parent/add-child'], { 
            queryParams: { firstLearner: 'true' } 
          });
        }
      } catch (error) {
        console.error('Error parsing cached learners:', error);
      }
    }
  }

  onSelectRole(role: 'kid' | 'parent' | 'teacher') {
    if (this.isLoggedIn && this.showOnlyGuardianAndLearner) {
      if (role === 'parent') {
        localStorage.removeItem('parentGuideLaunchPending');
        localStorage.setItem('parentNavGuidePending', 'true');
        localStorage.setItem('parentJourneyGuideComplete', 'true');
        this.router.navigate(['/parent']);
      } else if (role === 'kid') {
        localStorage.setItem('selectLearnerGuidePending', 'true');
        localStorage.setItem('parentNavGuidePending', 'true');
        localStorage.setItem('parentJourneyGuideComplete', 'true');
        this.router.navigate(['/parent/select-learner']);
      }
    } else {
      this.userRoleService.setRole(role);
      console.error('REDIRECT FROM: who-are-you.ts onSelectRole');
      this.router.navigate(['/sign-up/sign-in']);
    }
  }

  dismissRoleGuide() {
    this.showRoleGuide = false;
    localStorage.setItem('parentJourneyGuideComplete', 'true');
  }

  nextRoleGuideStep() {
    if (this.roleGuideStep === 0) {
      this.roleGuideStep = 1;
      return;
    }
    this.dismissRoleGuide();
  }

  skipAllGuides() {
    this.showRoleGuide = false;
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
    if (this.isMobileGuide && this.showRoleGuide) {
      this.showRoleGuide = false;
    }
  }

  private updateScreenMode() {
    this.isMobileGuide = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  }

  private skipAllGuidesOnMobile() {
    // Automatically mark all guides as complete on mobile devices
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
}