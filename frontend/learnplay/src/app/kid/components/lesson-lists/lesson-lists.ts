import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router, ActivatedRoute } from '@angular/router';
import { LessonService, LessonSummary } from '../../services/lesson/lesson';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { KidBreadcrumbComponent } from '../breadcrumb/kid-breadcrumb';
import { Location } from '@angular/common';
import { LearnersSummary, SubjectSummary } from '../../services/learners-summary/learners-summary';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification'; // Added
import { ToastService } from '../../../shared/services/toast.service';
import { LessonCard } from '../../reusable/lesson-card/lesson-card';

@Component({
  selector: 'app-lesson-lists',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    SpinnerOverlayComponent,
    KidBreadcrumbComponent,
    ToastNotificationComponent, // Added to fix 'app-toast' error
    LessonCard,
  ],
  templateUrl: './lesson-lists.html',
  styleUrl: './lesson-lists.css',
})
export class LessonLists implements OnInit {
  lessons: LessonSummary[] = [];
  isLoading = false;
  loadError = false; // Added to fix Property Error

  // Header Variables
  subTopicName: string = '';
  breadcrumbSubject: string = '';
  breadcrumbUnit: string = '';
  subjectPoints: number = 0; // Added to fix Property Error
  topicTitle: string = ''; // Added for consistency
  unitNumber: number = 0;
  currentSubjectIcon: string = 'assets/subject-icons/maths.png';
  activeLessons: LessonSummary[] = [];
  completedLessons: LessonSummary[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private lessonService: LessonService,
    private location: Location,
    private summaryService: LearnersSummary,
    public toast: ToastService,
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.breadcrumbSubject = navigation.extras.state['subjectName'];
      this.breadcrumbUnit = navigation.extras.state['unitTitle'];
      this.subjectPoints = navigation.extras.state['points'] || 0;
      this.subTopicName = navigation.extras.state['subTopicTitle'];
      this.topicTitle = navigation.extras.state['unitTitle'];
      this.unitNumber = navigation.extras.state['unitNumber'] || 0;
      this.currentSubjectIcon = navigation.extras.state['icon'] || 'assets/subject-icons/maths.png';
      localStorage.setItem('currentSubjectIcon', this.currentSubjectIcon);

      // 1. GET the raw sub-topic title (e.g., "1. ADDITION INDICES")
      const rawSubTopicTitle = navigation.extras.state['subTopicTitle'] || '';

      // 2. STRIP the "1. " prefix
      // This splits the string at the first period and takes everything after it
      if (rawSubTopicTitle.includes('.')) {
        this.subTopicName = rawSubTopicTitle.split('.')[1].trim();
      } else {
        this.subTopicName = rawSubTopicTitle;
      }
    } else {
      // FIX 1: Add fallback for browser "Back" navigation
      const storedPoints = localStorage.getItem('subjectPoints');
      this.subjectPoints = storedPoints ? +storedPoints : 0;

      this.breadcrumbSubject = localStorage.getItem('currentSubjectName') || '';
      this.breadcrumbUnit = localStorage.getItem('currentUnitName') || '';
      this.currentSubjectIcon =
        localStorage.getItem('currentSubjectIcon') || 'assets/subject-icons/maths.png';
    }
  }

  currentSubTopicId = '';

  ngOnInit() {
    //Clean the subtopic name in local storage for the breadcrumb
    const storedSubTopicName = localStorage.getItem('currentSubTopicName');
    if (storedSubTopicName && storedSubTopicName.includes('.')) {
      localStorage.setItem('currentSubTopicName', storedSubTopicName.split('.')[1].trim());
    }

    this.route.paramMap.subscribe((params) => {
      const subTopicId = params.get('subTopicId');
      const gsId = params.get('gsId') ?? localStorage.getItem('currentGsId');
      if (subTopicId) {
        this.currentSubTopicId = subTopicId;
        this.fetchLessons(subTopicId);
      }
      if (gsId) {
        this.refreshPoints(gsId);
      }
    });

    if (!this.subTopicName) {
      const storedName = localStorage.getItem('currentSubTopicName') || 'Lessons';
      this.subTopicName = storedName.includes('.') ? storedName.split('.')[1].trim() : storedName;
    }
  }

  // fetchLessons(id: string) {
  //   this.isLoading = true;
  //   this.loadError = false;
  //   const learnerId = JSON.parse(localStorage.getItem('selectedLearner') || '{}').id || '';
  //   this.lessonService.getLessonsBySubTopicId(id, learnerId).subscribe({
  //     next: (data) => {
  //       if (!data || data.length === 0) {
  //         this.lessons = [];
  //         this.isLoading = false;
  //         return;
  //       }

  //       const sortedByOrder = data.sort((a, b) => a.orderIndex - b.orderIndex);

  //       const processedLessons = sortedByOrder.map((lesson, index) => ({
  //         ...lesson,
  //         locked: index > 0 && !sortedByOrder[index - 1].learnerCompleted,
  //       }));

  //       // ADD THIS SORTING LOGIC:
  //       this.lessons = processedLessons.sort((a, b) => {
  //         // If 'a' is completed and 'b' is not, move 'a' down
  //         if (a.learnerCompleted && !b.learnerCompleted) return 1;
  //         // If 'a' is not completed and 'b' is, move 'a' up
  //         if (!a.learnerCompleted && b.learnerCompleted) return -1;
  //         return 0;
  //       });

  //       this.isLoading = false;
  //     },
  //     // ... error handling
  //   });
  // }

  fetchLessons(id: string) {
    this.isLoading = true;
    const learnerId = JSON.parse(localStorage.getItem('selectedLearner') || '{}').id || '';
    this.lessonService.getLessonsBySubTopicId(id, learnerId).subscribe({
      next: (data) => {
        // Strict numerical sort
        const sortedData = data.sort((a, b) => a.orderIndex - b.orderIndex);

        // Split the data
        this.activeLessons = sortedData.filter((l) => !l.learnerCompleted);
        this.completedLessons = sortedData.filter((l) => l.learnerCompleted);

        this.isLoading = false;
      },
      error: (err) => {
        this.loadError = true;
        this.isLoading = false;
      },
    });
  }

  refreshPoints(gsId: string) {
    const learnerData = localStorage.getItem('selectedLearner');
    const learnerId = learnerData ? JSON.parse(learnerData).id : null;

    if (learnerId && gsId) {
      this.summaryService.getLearnerLessonSummary(learnerId).subscribe({
        next: (summary) => {
          const currentSummary = summary.subjects.find((s: SubjectSummary) => s.id === gsId);
          if (currentSummary) {
            this.subjectPoints = currentSummary.points ?? 0;
            localStorage.setItem('subjectPoints', this.subjectPoints.toString());
          }
        },
        error: (err) => console.error('Error refreshing points:', err),
      });
    } else {
      const storedPoints = localStorage.getItem('subjectPoints');
      this.subjectPoints = storedPoints ? +storedPoints : 0;
    }
  }

  onSelectLesson(lesson: LessonSummary) {
    // No more lock checks, all lessons are dynamic
    localStorage.setItem('currentLessonPartName', lesson.name);
    this.router.navigate(['lesson', lesson.id], {
      relativeTo: this.route,
      state: {
        unitNumber: this.unitNumber,
        subTopicTitle: this.subTopicName,
        points: this.subjectPoints,
      },
    });
  }

  goBack() {
    this.location.back();
  }
}
