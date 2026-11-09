import { Component, OnInit, inject, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { ParentApiService, LearnerDto, GradeSubjectDetailsDto, LessonTrackerDto } from '../../services/parent-api.service';
import { LearnerTrackerSummaryDto, SubjectSummary } from '../../../models/learner-tracker-summary.interface';
import { AvatarUtilService } from '../../../services/avatar-util.service';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../shared/services/toast.service';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { forkJoin, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PosthogService } from '../../../services/posthog.service';
import { LearnerService } from '../../../kid/services/learner/learner';

interface Activity {
  type: string;
  title: string;
  description: string;
  points: number;
  date: string;
  icon: string;
}

interface Subject {
  id: string;
  name: string;
  icon: string;
  completedUnits: number;
  totalUnits: number;
  points: number;
  progress: number;
}

interface Child {
  id: string;
  name: string;
  age: number;
  gradeName?: string;
  courseName?: string;
  progress: number;
  totalPoints: number;
  activeSubjects: number;
  avatar: string;
  gender: string;
  memberSince: string;
  unitsCompleted: number;
  quizzesPassed: number;
  dayStreak: number;
  subjects: Subject[];
  recentActivities: Activity[];
}

interface ActivityPagination {
  displayedActivities: Activity[];
  hasMore: boolean;
  isExpanded: boolean;
  currentPage: number;
}

@Component({
  selector: 'app-child-details',
  imports: [CommonModule, SpinnerOverlayComponent, BreadcrumbComponent, ToastNotificationComponent, MatIconModule],
  templateUrl: './child-details.html',
  styleUrl: './child-details.css',
})
export class ChildDetails implements OnInit, OnDestroy {
  child: Child | null = null;
  learnerSummary: LearnerTrackerSummaryDto | null = null;
  isLoading = false;
  childNotFound = false;
  private routerSubscription?: Subscription;

  // Activity pagination properties
  activityPagination: ActivityPagination = {
    displayedActivities: [],
    hasMore: false,
    isExpanded: false,
    currentPage: 0
  };
  private readonly ACTIVITIES_PER_PAGE = 5;

  constructor(
    private router: Router, 
    private route: ActivatedRoute,
    private parentApiService: ParentApiService,
    private avatarUtilService: AvatarUtilService,
    private learnerService: LearnerService,
    public toast: ToastService,
    private posthogService: PosthogService
  ) {}

  ngOnInit() {
    // Track page view
    this.posthogService.posthog.capture('child_details_page_viewed', {
      source: 'parent_dashboard',
      child_id: this.route.snapshot.params['id'] || 'unknown'
    });

    this.loadChildData();
    
    // Listen for navigation events to refresh data when returning from edit profile
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // If we're navigating to this child details page, refresh the data
        if (event.url.includes('/parent/child/')) {
          this.refreshChildData();
        }
      });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  loadChildData() {
    const storedChild = localStorage.getItem('selectedChild');
    if (storedChild) {
      this.child = JSON.parse(storedChild);
      
      // If the child name is undefined or invalid, refresh from learners array
      if (this.child && (!this.child.name || this.child.name === 'undefined undefined' || this.child.name.includes('undefined'))) {
        this.refreshLearnerDataFromStorage();
      }
      
      if (this.child && !this.child.gender) {
        this.child.gender = this.getGenderFromStorage(this.child.id);
      }
      if (this.child?.id) {
        this.loadLearnerProgress(this.child.id);
      }
    } else {
      this.childNotFound = true;
    }
  }

  refreshChildData() {
    // Always refresh from the learners array first, as it has the most up-to-date data
    this.refreshLearnerDataFromStorage();
    
    // Then check if selectedChild needs to be updated
    const storedChild = localStorage.getItem('selectedChild');
    if (storedChild && this.child) {
      try {
        const updatedChild = JSON.parse(storedChild);
        
        // Update the child object with any changes from selectedChild
        if (updatedChild.name && updatedChild.name !== 'undefined undefined') {
          this.child.name = updatedChild.name;
        }
        if (updatedChild.avatar) {
          this.child.avatar = updatedChild.avatar;
        }
        if (updatedChild.gender) {
          this.child.gender = updatedChild.gender;
        }
        
        console.log('Refreshed child data:', this.child);
      } catch (error) {
        console.error('Error parsing selectedChild from localStorage:', error);
      }
    }
  }

  refreshLearnerDataFromStorage() {
    if (!this.child) return;
    
    try {
      const learners = localStorage.getItem('learners');
      const courses = localStorage.getItem('courses');
      
      if (learners) {
        const learnersArray = JSON.parse(learners);
        const coursesArray = courses ? JSON.parse(courses) : [];
        const updatedLearner = learnersArray.find((l: any) => l.id === this.child?.id);
        
        if (updatedLearner) {
          // Build the name properly from the learner data
          let displayName = '';
          if (updatedLearner.preferredName && updatedLearner.preferredName.trim()) {
            displayName = updatedLearner.preferredName.trim();
          } else if (updatedLearner.firstName && updatedLearner.lastName) {
            displayName = `${updatedLearner.firstName.trim()} ${updatedLearner.lastName.trim()}`;
          } else if (updatedLearner.firstName) {
            displayName = updatedLearner.firstName.trim();
          }
          
          // Get grade name
          const gradeName = this.formatGradeName(updatedLearner.gradeName);
          
          // Get course name
          let courseName = '';
          if (updatedLearner.courseId && coursesArray.length > 0) {
            const course = coursesArray.find((c: any) => c.id === updatedLearner.courseId);
            courseName = course ? this.formatCourseName(course.title) : '';
          }
          
          // Update child with fresh data from learners array
          if (displayName) {
            this.child.name = displayName;
          }
          if (updatedLearner.avatar) {
            this.child.avatar = updatedLearner.avatar;
          }
          if (updatedLearner.gender) {
            this.child.gender = updatedLearner.gender;
          }
          if (gradeName) {
            this.child.gradeName = gradeName;
          }
          if (courseName) {
            this.child.courseName = courseName;
          }
          
          // Update the selectedChild in localStorage with the correct data
          const updatedSelectedChild = {
            ...this.child,
            name: displayName,
            avatar: updatedLearner.avatar,
            gender: updatedLearner.gender,
            gradeName: gradeName,
            courseName: courseName
          };
          localStorage.setItem('selectedChild', JSON.stringify(updatedSelectedChild));
          
          console.log('Updated child data from learners array:', this.child);
        }
      }
    } catch (error) {
      console.error('Error refreshing learner data from storage:', error);
    }
  }

  loadLearnerProgress(learnerId: string) {
    this.isLoading = true;
    console.log('Fetching learner data for ID:', learnerId);
    
    // Fetch both summary and history in parallel
    forkJoin({
      summary: this.parentApiService.getLearnerSummary(learnerId),
      history: this.parentApiService.getLearnerHistory(learnerId)
    }).subscribe({
      next: ({ summary, history }) => {
        console.log('Received learner summary:', summary);
        console.log('Received learner history:', history);
        
        this.learnerSummary = summary;
        
        if (this.child) {
          // Update child data with real progress data
          this.child.progress = Math.round(summary.percentageCompleted || 0);
          this.child.totalPoints = summary.points || 0;
          this.child.activeSubjects = summary.subjects?.length || 0;
          this.child.unitsCompleted = summary.lessonCompletedCount || 0;
          this.child.dayStreak = summary.streak || 0;
          this.child.quizzesPassed = 0; // Not available in current API
          
          // Get member since from stored learner data
          this.child.memberSince = this.getMemberSinceFromStorage();
          
          // Map subjects from API response
          this.child.subjects = this.mapSubjectsFromSummary(summary.subjects || []);
          
          // Map recent activities from history API response
          this.child.recentActivities = this.mapActivitiesFromHistory(history || []);
          
          // Initialize activity pagination
          this.initializeActivityPagination();
          
          console.log('Updated child data:', this.child);
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching learner data:', error);
        this.isLoading = false;
        this.toast.show('Progress data couldn\'t be loaded. Please try again.', 'error');
        if (this.child) {
          this.child.totalPoints = this.getActualPointsFromStorage();
          this.child.unitsCompleted = 0;
          this.child.quizzesPassed = 0;
          this.child.dayStreak = 0;
          this.child.memberSince = this.getMemberSinceFromStorage();
          this.child.recentActivities = [];
          this.child.subjects = [];
          
          // Initialize empty activity pagination
          this.initializeActivityPagination();
        }
      }
    });
  }

  getActualPointsFromStorage(): number {
    try {
      const learners = localStorage.getItem('learners');
      if (learners && this.child) {
        const learnersArray = JSON.parse(learners);
        const currentLearner = learnersArray.find((l: any) => l.id === this.child?.id);
        
        if (currentLearner && currentLearner.points !== undefined) {
          return currentLearner.points;
        }
      }
    } catch (error) {
      console.error('Error parsing learner data from storage:', error);
    }
    return 0;
  }

  getMemberSinceFromStorage(): string {
    try {
      const learners = localStorage.getItem('learners');
      if (learners && this.child) {
        const learnersArray = JSON.parse(learners);
        const currentLearner = learnersArray.find((l: any) => l.id === this.child?.id);
        
        if (currentLearner && currentLearner.createdAt) {
          return this.formatMemberSince(currentLearner.createdAt);
        }
      }
    } catch (error) {
      console.error('Error parsing learner data from storage:', error);
    }
    return '-';
  }

  formatMemberSince(createdAt: string): string {
    try {
      const date = new Date(createdAt);
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      
      return `${month} ${year}`;
    } catch (error) {
      console.error('Error formatting member since date:', error);
      return '-';
    }
  }

  mapSubjectsFromSummary(subjects: SubjectSummary[]): Subject[] {
    const iconMap: { [key: string]: string } = {
      'MATHEMATICS': 'mathematics',
      'MATH': 'mathematics',
      'MATHS': 'maths',
      'ENGLISH': 'english',
      'SCIENCE': 'science',
      'KISWAHILI': 'kiswahili',
      'MUSIC': 'music',
      'ART': 'art',
      'BIOLOGY': 'biology',
      'GEOGRAPHY': 'geography',
      'HISTORY': 'history and Government',
      'HISTORY AND GOVERNMENT': 'history and Government',
      'HOME SCIENCE': 'home-science',
      'ISLAM': 'islam',
      'SOCIAL STUDIES': 'science',
      'GERMAN': 'german',
      'SPANISH': 'spanish',
    };
    
    return subjects.map(subject => ({
      id: subject.id,
      name: subject.name,
      icon: iconMap[subject.name.toUpperCase()] || 'subject',
      completedUnits: subject.lessonCompletedCount || 0, // Lessons completed for this subject
      totalUnits: subject.lessonCount || 0, // Total lessons for this subject
      points: subject.points || 0,
      progress: Math.round(subject.percentageCompleted || 0)
    }));
  }

  mapActivitiesFromHistory(history: LessonTrackerDto[]): Activity[] {
    return history.map(item => ({
      type: 'lesson_completed',
      title: `Completed ${item.lessonName}`,
      description: `${item.subjectName} lesson completed`,
      points: item.points ?? 10,
      date: item.completedAt,
      icon: 'trophy'
    }));
  }

  getLessonText(count: number): string {
    return count === 1 ? 'lesson' : 'lessons';
  }

  onBackToChildren() {
    this.posthogService.posthog.capture('back_to_children_clicked', {
      source: 'child_details_page',
      child_id: this.child?.id,
      child_name: this.child?.name
    });
    this.router.navigate(['/parent']);
  }

  goToRecentActivities() {
    this.router.navigate(['/parent/recent-activities'], { queryParams: { from: 'parent' } });
  }

  goToLearnerDashboard() {
    if (!this.child) return;
    const storedLearners: any[] = JSON.parse(localStorage.getItem('learners') || '[]');
    const fullLearner = storedLearners.find((l: any) => l.id === this.child!.id);
    if (fullLearner) {
      this.learnerService.updateSelectedLearner(fullLearner);
    }
    this.router.navigate(['/kid']);
  }

  getGenderFromStorage(childId: string): string {
    try {
      const learners = localStorage.getItem('learners');
      if (learners) {
        const learnersArray = JSON.parse(learners);
        const currentLearner = learnersArray.find((l: any) => l.id === childId);
        
        if (currentLearner && currentLearner.gender) {
          return currentLearner.gender;
        }
      }
    } catch (error) {
      console.error('Error getting gender from storage:', error);
    }
    return 'MALE'; // Default fallback
  }

  getAvatarPath(child: Child): string {
    return this.avatarUtilService.getLearnerAvatarPath(child);
  }

  // Learner Profile Modal Methods
  openLearnerProfileModal() {
    if (this.child) {
      // Track edit profile action
      this.posthogService.posthog.capture('edit_child_profile_clicked', {
        source: 'child_details_page',
        child_id: this.child.id,
        child_name: this.child.name,
        child_age: this.child.age,
        child_gender: this.child.gender
      });

      // Store the selected learner ID for later use
      localStorage.setItem('selectedLearnerId', this.child.id);
      
      // Convert child data to the format expected by the edit profile page
      const learnerForEdit = {
        id: this.child.id,
        firstName: this.child.name.split(' ')[0] || '',
        lastName: this.child.name.split(' ').slice(1).join(' ') || '',
        preferredName: this.child.name,
        gender: this.child.gender,
        avatar: this.child.avatar,
        // Get additional data from storage
        ...this.getAdditionalLearnerDataFromStorage(this.child.id)
      };
      
      // Store the learner data for the edit page
      localStorage.setItem('selectedLearnerForEdit', JSON.stringify(learnerForEdit));
      
      // Navigate to the edit profile page
      this.router.navigate(['/parent/edit-learner-profile']);
    }
  }

  closeLearnerProfileModal() {
    // This method is no longer needed but kept for compatibility
    // The edit profile page handles its own navigation
  }

  onLearnerProfileUpdated(updatedLearner: any) {
    // This method is no longer needed but kept for compatibility
    // The edit profile page handles its own updates and navigation
  }

  private getAdditionalLearnerDataFromStorage(childId: string): any {
    try {
      const learners = localStorage.getItem('learners');
      if (learners) {
        const learnersArray = JSON.parse(learners);
        const currentLearner = learnersArray.find((l: any) => l.id === childId);
        
        if (currentLearner) {
          return {
            dob: currentLearner.dob,
            birthCertificateNumber: currentLearner.birthCertificateNumber,
            courseId: currentLearner.courseId,
            gradeId: currentLearner.gradeId,
            gradeName: currentLearner.gradeName,
            // Include all other properties that might be needed
            ...currentLearner
          };
        }
      }
    } catch (error) {
      console.error('Error getting additional learner data from storage:', error);
    }
    return {};
  }

  // Settings Menu Methods (kept for future use)
  toggleSettingsMenu(event: MouseEvent) {
    event.stopPropagation();
    // Settings menu functionality can be added here if needed
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Document click handler for settings menu if needed
  }

  private formatGradeName(gradeName: string | undefined): string {
    if (!gradeName) return '';
    // Convert "GRADE 8" to "Grade 8"
    return gradeName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  private formatCourseName(courseName: string): string {
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

  // Activity pagination methods
  initializeActivityPagination() {
    if (!this.child?.recentActivities) {
      this.activityPagination = {
        displayedActivities: [],
        hasMore: false,
        isExpanded: false,
        currentPage: 0
      };
      return;
    }

    const activities = this.child.recentActivities;
    const initialActivities = activities.slice(0, this.ACTIVITIES_PER_PAGE);
    
    this.activityPagination = {
      displayedActivities: initialActivities,
      hasMore: activities.length > this.ACTIVITIES_PER_PAGE,
      isExpanded: false,
      currentPage: 1
    };
  }

  loadMoreActivities() {
    if (!this.child?.recentActivities || !this.activityPagination.hasMore) return;

    const activities = this.child.recentActivities;
    const startIndex = this.activityPagination.currentPage * this.ACTIVITIES_PER_PAGE;
    const endIndex = startIndex + this.ACTIVITIES_PER_PAGE;
    const newActivities = activities.slice(startIndex, endIndex);
    
    this.activityPagination.displayedActivities = [
      ...this.activityPagination.displayedActivities,
      ...newActivities
    ];
    
    this.activityPagination.currentPage++;
    this.activityPagination.hasMore = endIndex < activities.length;
    this.activityPagination.isExpanded = true;

    // Track analytics
    this.posthogService.posthog.capture('recent_activity_load_more_clicked', {
      child_id: this.child.id,
      child_name: this.child.name,
      current_page: this.activityPagination.currentPage,
      total_activities: activities.length,
      displayed_activities: this.activityPagination.displayedActivities.length
    });
  }

  showLessActivities() {
    if (!this.child?.recentActivities) return;

    const activities = this.child.recentActivities;
    const initialActivities = activities.slice(0, this.ACTIVITIES_PER_PAGE);
    
    this.activityPagination = {
      displayedActivities: initialActivities,
      hasMore: activities.length > this.ACTIVITIES_PER_PAGE,
      isExpanded: false,
      currentPage: 1
    };

    // Track analytics
    this.posthogService.posthog.capture('recent_activity_show_less_clicked', {
      child_id: this.child.id,
      child_name: this.child.name,
      total_activities: activities.length
    });
  }

  // TrackBy function for better performance
  trackByActivityDate(index: number, activity: Activity): string {
    return activity.date + activity.title;
  }

}