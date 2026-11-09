import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild, Pipe, PipeTransform  } from '@angular/core';
import { NgClass, CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProgressBar } from '../../reusable/progress-bar/progress-bar';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { LearnerService } from '../../services/learner/learner';
import {
  GradeSubjectService,
  GradeSubjectDetails,
} from '../../services/grade-subjects/grade-subjects';
import { LearnersSummary, SubjectSummary } from '../../services/learners-summary/learners-summary';
import { forkJoin, Subscription } from 'rxjs';
import { catchError, of, filter } from 'rxjs';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { KidBreadcrumbComponent } from '../breadcrumb/kid-breadcrumb';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../shared/services/toast.service';
import { AnalyticsService } from '../../../services/analytics.service';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
  standalone: true
})
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string, search: string): SafeHtml | string {
    if (!search || !value) {
      return value;
    }
    
    // Escape special characters so regex doesn't break
    const cleanSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const re = new RegExp(`(${cleanSearch})`, 'gi');
    
    if (!re.test(value)) {
      return value;
    }
    
    // Wrap the matched text in a <mark> tag with Tailwind styling
    const replacedValue = value.replace(re, `<mark class="bg-yellow-300 text-inherit rounded-md px-1">$1</mark>`);
    return this.sanitizer.bypassSecurityTrustHtml(replacedValue);
  }
}

@Component({
  selector: 'app-main-content',
  imports: [
    NgClass,
    CommonModule,
    MatCardModule,
    MatToolbarModule,
    MatIconModule,
    MatProgressBarModule,
    ProgressBar,
    FormsModule,
    SpinnerOverlayComponent,
    KidBreadcrumbComponent,
    ToastNotificationComponent,
    HighlightPipe,
  ],
  templateUrl: './main-content.html',
  styleUrl: './main-content.css',
})
export class MainContent implements OnInit, OnDestroy {
  @ViewChild('searchContainer') searchContainer!: ElementRef;

  userName = 'Guest';
  allSubjects: GradeSubjectDetails[] = [];
  filteredSubjects: GradeSubjectDetails[] = [];
  searchTerm: string = '';
  isSearchExpanded = false;
  isLoading = false;
  loadError = false;
  showSubjectGuide = false;
  isMobileGuide = false; // Added mobile detection
  private routerSubscription?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private learnerService: LearnerService,
    private gradeSubjectService: GradeSubjectService,
    private summaryService: LearnersSummary,
    public toast: ToastService,
    private analyticsService: AnalyticsService,
  ) {}

  ngOnInit(): void {
    const navGuidePending = localStorage.getItem('kidNavGuidePending') === 'true';

    this.updateScreenMode();

    // Track kid dashboard access
    const selectedLearnerStr = localStorage.getItem('selectedLearner');
    if (selectedLearnerStr) {
      const selectedLearner = JSON.parse(selectedLearnerStr);
      this.analyticsService.trackFeatureUsage('kid_subjects_dashboard_viewed', {
        learner_id: selectedLearner.id,
        learner_name: selectedLearner.firstName || selectedLearner.preferredName,
        grade_id: selectedLearner.gradeId,
      });
    }

    // Only show subject guide on larger screens (not mobile)
    this.showSubjectGuide =
      localStorage.getItem('kidSubjectGuidePending') === 'true' &&
      !navGuidePending &&
      localStorage.getItem('kidSubjectGuideComplete') !== 'true' &&
      !this.isMobileGuide; // Added condition to prevent showing on mobile

    if (selectedLearnerStr) {
      const selectedLearner = JSON.parse(selectedLearnerStr);
      this.userName = selectedLearner.firstName || selectedLearner.preferredName || 'Learner';
      const gradeId = selectedLearner.gradeId;
      const learnerId = selectedLearner.id;
      if (gradeId && learnerId) {
        this.loadDashboardData(learnerId, gradeId);
      } else {
        this.toast.show('Something went wrong. Please go back and select a learner.', 'error');
      }
    } else {
      this.toast.show('Something went wrong. Please go back and select a learner.', 'error');
    }

    // Listen for navigation events to refresh points when returning to main dashboard
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // Check if we're navigating to the main dashboard (subjects list)
        // The main dashboard is at '/kid' (empty path within the kid module)
        if (event.url === '/kid' || event.urlAfterRedirects === '/kid') {
          // Small delay to ensure the component is fully loaded
          setTimeout(() => {
            this.refreshPointsData();
          }, 100);
        }
      });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  // Listen for window focus events to refresh data when user returns to the tab
  @HostListener('window:focus', [])
  onWindowFocus() {
    // Only refresh if we're on the main dashboard
    if (this.router.url === '/kid') {
      this.refreshPointsData();
    }
  }

  // Listen for lesson completion events
  @HostListener('window:lessonCompleted', ['$event'])
  onLessonCompleted(event: Event) {
    const customEvent = event as CustomEvent;
    console.log('Lesson completed event received:', customEvent.detail);
    // Refresh points data when a lesson is completed
    this.refreshPointsData();
  }

  // Listen for clicks anywhere in the document
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // If search is expanded and the user hasn't typed anything
    if (this.isSearchExpanded && !this.searchTerm.trim()) {
      // Check if the click was OUTSIDE the search container
      if (!this.searchContainer.nativeElement.contains(event.target)) {
        this.isSearchExpanded = false;
      }
    }
  }

  // Listen for scroll events
  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Automatically collapse if user scrolls and search is empty
    if (this.isSearchExpanded && !this.searchTerm.trim()) {
      this.isSearchExpanded = false;
    }
  }

  loadDashboardData(learnerId: string, gradeId: string) {
    this.isLoading = true;
    this.loadError = false;
    forkJoin({
      uiDetails: this.gradeSubjectService.getSubjectsByGrade(gradeId).pipe(
        catchError((err) => {
          // Track API failure
          this.analyticsService.trackError('subjects_api_failed', err.message || 'Unknown error', {
            grade_id: gradeId,
            learner_id: learnerId,
            error_status: err.status,
          });
          // If the subjects API fails entirely, trigger error state
          this.loadError = true;
          return of([]);
        }),
      ),
      progressSummary: this.summaryService.getLearnerLessonSummary(learnerId).pipe(
        catchError((error) => {
          console.error('Summary API failed:', error);
          this.analyticsService.trackError(
            'progress_summary_api_failed',
            error.message || 'Unknown error',
            {
              learner_id: learnerId,
              error_status: error.status,
            },
          );
          return of({ subjects: [] } as any);
        }),
      ),
    }).subscribe({
      next: (result) => {
        if (this.loadError) {
          this.isLoading = false;
          return;
        }

        // Track successful dashboard load
        this.analyticsService.trackFeatureUsage('dashboard_data_loaded_success', {
          learner_id: learnerId,
          grade_id: gradeId,
          subjects_count: result.uiDetails?.length || 0,
          has_progress_data: !!result.progressSummary?.subjects?.length,
        });

        // 1. Map the subjects as you did before
        const mappedSubjects = result.uiDetails.map((uiSubject) => {
          const realProgress = result.progressSummary.subjects?.find(
            (s: any) => s.id === uiSubject.gradeSubjectId || s.id === uiSubject.id,
          );
          return {
            ...uiSubject,
            progress: realProgress ? realProgress.percentageCompleted : 0,
            points: realProgress ? realProgress.points : 0,
          };
        });

        // 2. SORT ALPHABETICALLY (A-Z)
        this.allSubjects = mappedSubjects.sort((a, b) => a.name.localeCompare(b.name));

        // 3. Initialize the display list
        this.applyFilter();

        this.isLoading = false;
      },
      error: (err) => {
        console.error('General Error:', err);
        this.analyticsService.trackError('dashboard_load_failed', err.message || 'Unknown error', {
          learner_id: learnerId,
          grade_id: gradeId,
          error_status: err.status,
        });
        this.loadError = true;
        this.isLoading = false;
      },
    });
  }

  /**
   * Refreshes only the points data without showing loading spinner
   * Called when navigating back to dashboard after completing lessons
   */
  refreshPointsData() {
    const selectedLearnerStr = localStorage.getItem('selectedLearner');
    if (!selectedLearnerStr || this.allSubjects.length === 0) {
      return; // No learner selected or no subjects loaded yet
    }

    const selectedLearner = JSON.parse(selectedLearnerStr);
    const learnerId = selectedLearner.id;

    console.log('Refreshing points data for learner:', learnerId);

    // Fetch updated progress summary
    this.summaryService.getLearnerLessonSummary(learnerId).subscribe({
      next: (progressSummary) => {
        console.log('Received updated progress summary:', progressSummary);
        
        // Update points for each subject
        this.allSubjects = this.allSubjects.map((subject) => {
          const realProgress = progressSummary.subjects?.find(
            (s: any) => s.id === subject.gradeSubjectId || s.id === subject.id,
          );
          
          const updatedSubject = {
            ...subject,
            progress: realProgress ? realProgress.percentageCompleted : subject.progress,
            points: realProgress ? realProgress.points : subject.points,
          };
          
          // Log if points changed
          if (updatedSubject.points !== subject.points) {
            console.log(`Points updated for ${subject.name}: ${subject.points} -> ${updatedSubject.points}`);
          }
          
          return updatedSubject;
        });

        // Update the filtered list
        this.applyFilter();

        console.log('Points refreshed successfully');
      },
      error: (err) => {
        console.error('Failed to refresh points:', err);
        // Don't show error to user as this is a background refresh
      },
    });
  }

  toggleSearch() {
    this.isSearchExpanded = !this.isSearchExpanded;

    // Optional: Focus the input when expanded
    if (this.isSearchExpanded) {
      setTimeout(() => {
        const input = document.getElementById('subjectSearch') as HTMLInputElement;
        input?.focus();
      }, 300);
    }
  }

  // Update applyFilter slightly to handle clearing
  applyFilter() {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredSubjects = [...this.allSubjects];
    } else {
      this.filteredSubjects = this.allSubjects.filter((s) => s.name.toLowerCase().includes(term));
    }
  }

  onSelectSubject(subject: any) {
    // Track subject selection
    const selectedLearnerStr = localStorage.getItem('selectedLearner');
    const selectedLearner = selectedLearnerStr ? JSON.parse(selectedLearnerStr) : null;

    this.analyticsService.trackFeatureUsage('subject_selected', {
      subject_name: subject.name,
      subject_id: subject.gradeSubjectId || subject.id,
      subject_progress: subject.progress,
      subject_points: subject.points,
      learner_id: selectedLearner?.id,
      learner_name: selectedLearner?.firstName || selectedLearner?.preferredName,
    });

    this.isSearchExpanded = false;
    if (this.showSubjectGuide) {
      this.dismissSubjectGuide();
    }
    const name = subject.name;
    const gsId = subject.gradeSubjectId || subject.id;
    localStorage.setItem('currentSubjectName', name);
    localStorage.setItem('currentGsId', gsId);
    console.log(`Navigating to ${name}. Passing points: ${subject.points}`);
    this.router.navigate(['subject', name.toLowerCase(), gsId], {
      relativeTo: this.route,
      state: {
        points: subject.points, // Send the points we already calculated
        icon: subject.icon,
        bgColor: subject.bgColor,
        textColor: subject.textColor,
        gradient: subject.gradient,
        //description: subject.description,
      },
    });
  }

  onBackToSelectLearner() {
    this.analyticsService.trackButtonClick('back_to_select_learner', {
      source: 'kid_subjects_dashboard',
    });
    this.router.navigate(['/parent/select-learner']);
  }

  dismissSubjectGuide() {
    this.showSubjectGuide = false;
    localStorage.setItem('kidSubjectGuideComplete', 'true');
    localStorage.removeItem('kidSubjectGuidePending');
  }

  skipAllGuides() {
    this.showSubjectGuide = false;
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

  @HostListener('window:kidNavGuideCompleted')
  onKidNavGuideCompleted() {
    const alreadyDone = localStorage.getItem('kidSubjectGuideComplete') === 'true';
    if (!alreadyDone && !this.isMobileGuide) {
      // Added mobile check
      this.showSubjectGuide = true;
      localStorage.removeItem('kidSubjectGuidePending');
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.updateScreenMode();

    // Hide tour guide if screen becomes mobile-sized
    if (this.isMobileGuide && this.showSubjectGuide) {
      this.showSubjectGuide = false;
    }
  }

  private updateScreenMode() {
    this.isMobileGuide = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  }
}
