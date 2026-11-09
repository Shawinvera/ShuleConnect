import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { ProgressBar } from '../../reusable/progress-bar/progress-bar';
import { TopicService, TopicSummary } from '../../services/topic/topic';
import { SubTopicService } from '../../services/sub-topic/sub-topic';
import { LessonService, LessonSummary } from '../../services/lesson/lesson';
import { Location } from '@angular/common';
import { LearnersSummary, SubjectSummary } from '../../services/learners-summary/learners-summary';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { KidBreadcrumbComponent } from '../breadcrumb/kid-breadcrumb';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../shared/services/toast.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AnalyticsService } from '../../../services/analytics.service';
import { LessonCard } from '../../reusable/lesson-card/lesson-card';

interface Unit {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'locked';
  subtopicsTotal: number;
  subtopicsCompleted: number;
  pointsEarned?: number;
  decorationIcon: string; // Using emojis for demo purposes
  iconBg: string;
}

// Define the shape of our subject data
interface SubjectInfo {
  name: string;
  icon: string;
  gradient: string; // The card background
  textColor: string; // The text color
  description: string;
}

@Component({
  selector: 'app-subject-lessons',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    SpinnerOverlayComponent,
    KidBreadcrumbComponent,
    ToastNotificationComponent,
    LessonCard,
  ],
  templateUrl: './subject-lessons.html',
  styles: [
    `
      ::ng-deep .orange-progress .mdc-linear-progress__bar-inner {
        border-color: #f97316 !important;
      }
      ::ng-deep .orange-progress .mdc-linear-progress__buffer-bar {
        background-color: #e5e7eb !important;
      }
    `,
  ],
})
export class SubjectLessons implements OnInit {
  units: Unit[] = [];
  subjectPoints: number = 0;
  isLoading = false;
  loadError = false;
  resumeData: {
    unitId: string;
    subTopicId: string;
    lessonId: string;
    subTopicName: string;
  } | null = null;
  showAllLessons = true; // Toggle state
  allSubjectLessons: LessonSummary[] = []; // Store for the global list
  isLessonsLoading = false;
  activeSubjectLessons: LessonSummary[] = [];
  completedSubjectLessons: LessonSummary[] = [];

  // 2. Define currentSubject to fix the "does not exist" error
  currentSubject: SubjectInfo = {
    name: '',
    icon: 'assets/subject-icons/maths.png',
    gradient: 'linear-gradient(134.45deg,#F8C96C 15.3%,#FCA780 81.76%)',
    textColor: '#CA8A04',
    description: '',
  };

  // Add a list of beautiful gradients for the topic icons
  private gradients = [
    'linear-gradient(134.45deg, #FF9A9E 15.3%, #FECFEF 81.76%)', // Pink
    'linear-gradient(134.45deg, #67ECA3 15.3%, #43D785 81.76%)', // Green
    'linear-gradient(134.45deg, #a18cd1 15.3%, #fbc2eb 81.76%)', // Purple/Lilac
    'linear-gradient(134.45deg, #fccb90 15.3%, #d57eeb 81.76%)', // Orange/Pink
    'linear-gradient(134.45deg, #84fab0 15.3%, #8fd3f4 81.76%)', // Mint/Cyan
    'linear-gradient(134.45deg, #e0c3fc 15.3%, #8ec5fc 81.76%)', // Light Purple/Blue
    'linear-gradient(134.45deg, #fa709a 15.3%, #fee140 81.76%)', // Rose/Yellow
    'linear-gradient(134.45deg, #4facfe 15.3%, #00f2fe 81.76%)', // Bright Blue
  ];

  // Helper method to convert any string to Title Case
  private toTitleCase(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  //Inject Router
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private topicService: TopicService,
    private subTopicService: SubTopicService,
    private lessonService: LessonService,
    private location: Location,
    private summaryService: LearnersSummary,
    public toast: ToastService,
    private analyticsService: AnalyticsService,
  ) {
    // Get points from Navigation State immediately
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      const state = navigation.extras.state;
      this.subjectPoints = navigation.extras.state['points'] || 0;

      // POPULATE currentSubject DYNAMICALLY FROM STATE
      this.currentSubject = {
        name: '', // Will be set in ngOnInit from URL
        icon: state['icon'] || 'assets/subject-icons/maths.png',
        gradient: state['gradient'] || 'linear-gradient(134.45deg,#F8C96C 15.3%,#FCA780 81.76%)',
        textColor: state['textColor'] || '#9333EA',
        description: state['description'] || '',
      };

      localStorage.setItem('subjectPoints', this.subjectPoints.toString());
      // Save styles for refresh persistence
      localStorage.setItem('currentSubjectStyles', JSON.stringify(this.currentSubject));
    } else {
      // Fallback for Page Refresh
      const storedPoints = localStorage.getItem('subjectPoints');
      this.subjectPoints = storedPoints ? +storedPoints : 0;

      const storedStyles = localStorage.getItem('currentSubjectStyles');
      if (storedStyles) {
        this.currentSubject = JSON.parse(storedStyles);
      }
    }
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const subjectSlug = params.get('subjectId');
      // Attempt to get gsId from URL, fallback to localStorage if null
      let gradeSubjectId = params.get('gsId');
      if (!gradeSubjectId) {
        gradeSubjectId = localStorage.getItem('currentGsId');
      }

      // Track subject access
      const learnerData = localStorage.getItem('selectedLearner');
      const learner = learnerData ? JSON.parse(learnerData) : null;
      const learnerId = learner?.id;

      this.analyticsService.trackFeatureUsage('subject_lessons_viewed', {
        subject_name: subjectSlug,
        grade_subject_id: gradeSubjectId,
        learner_id: learner?.id,
        learner_name: learner?.firstName,
      });

      if (subjectSlug) {
        // Update the name dynamically based on URL
        this.currentSubject.name = subjectSlug.charAt(0).toUpperCase() + subjectSlug.slice(1);
      }

      if (gradeSubjectId && learnerId) {
        this.loadTopics(gradeSubjectId);
        // NEW: Fetch dynamic points from backend
        this.refreshSubjectPoints(learnerId, gradeSubjectId);
        this.fetchAllLessons();
      }
    });
  }

  // 1. Add toggle method
  toggleView() {
    this.showAllLessons = !this.showAllLessons;

    // Fetch lessons only if we are switching to 'All Lessons' view and haven't loaded them yet
    if (this.showAllLessons && this.allSubjectLessons.length === 0) {
      this.fetchAllLessons();
    }
  }

  // fetchAllLessons() {
  //   const gradeSubjectId =
  //     this.route.snapshot.params['gsId'] || localStorage.getItem('currentGsId');
  //   const learnerId = JSON.parse(localStorage.getItem('selectedLearner') || '{}').id;

  //   if (gradeSubjectId && learnerId) {
  //     this.isLessonsLoading = true;
  //     this.lessonService.getLessonsByGradeSubject(gradeSubjectId, learnerId).subscribe({
  //       next: (data) => {
  //         // Sort them logically by their Topic and SubTopic order
  //         this.allSubjectLessons = data.sort((a, b) => a.orderIndex - b.orderIndex);
  //         this.isLessonsLoading = false;
  //       },
  //       error: (err) => {
  //         this.isLessonsLoading = false;
  //         this.toast.show('Failed to load all lessons', 'error');
  //       },
  //     });
  //   }
  // }

  fetchAllLessons() {
    const gradeSubjectId =
      this.route.snapshot.params['gsId'] || localStorage.getItem('currentGsId');
    const learnerId = JSON.parse(localStorage.getItem('selectedLearner') || '{}').id;

    if (gradeSubjectId && learnerId) {
      this.isLessonsLoading = true;
      this.lessonService.getLessonsByGradeSubject(gradeSubjectId, learnerId).subscribe({
        next: (data) => {
          // // MULTI-LEVEL SORT: Topic Order -> SubTopic Order -> Lesson Order
          // this.allSubjectLessons = data.sort((a, b) => {
          //   if (a.topicOrderIndex !== b.topicOrderIndex) {
          //     return a.topicOrderIndex - b.topicOrderIndex;
          //   }
          //   if (a.subTopicOrderIndex !== b.subTopicOrderIndex) {
          //     return a.subTopicOrderIndex - b.subTopicOrderIndex;
          //   }
          //   return a.orderIndex - b.orderIndex;
          // });
          const sorted = data.sort((a, b) => {
            if (a.topicOrderIndex !== b.topicOrderIndex)
              return a.topicOrderIndex - b.topicOrderIndex;
            if (a.subTopicOrderIndex !== b.subTopicOrderIndex)
              return a.subTopicOrderIndex - b.subTopicOrderIndex;
            return a.orderIndex - b.orderIndex;
          });

          this.activeSubjectLessons = sorted.filter((l) => !l.learnerCompleted);
          this.completedSubjectLessons = sorted.filter((l) => l.learnerCompleted);
          this.isLessonsLoading = false;
        },
        error: (err) => {
          this.isLessonsLoading = false;
          this.toast.show('Failed to load all lessons', 'error');
        },
      });
    }
  }

  onSelectGlobalLesson(lesson: LessonSummary) {
    // 1. Log the selection
    const learnerData = localStorage.getItem('selectedLearner');
    const learner = learnerData ? JSON.parse(learnerData) : null;

    this.analyticsService.trackFeatureUsage('global_lesson_selected', {
      lesson_name: lesson.name,
      subject_name: this.currentSubject.name,
      learner_id: learner?.id,
    });

    // 2. Extract IDs
    // Note: Depending on your API, topicId might be directly on the lesson
    // or inside a subTopic object. We cast to any to find it.
    const lessonId = lesson.id;
    const subTopicId = lesson.subTopicId;
    const topicId = (lesson as any).topicId || (lesson as any).subTopic?.topicId;

    // 3. Fallback check: If topicId is missing, navigation will fail to Home.
    // We check if we can find it, otherwise we use the first unit's ID as a fallback
    // or show an error.
    if (!topicId || !subTopicId) {
      console.error('Missing IDs for navigation:', { topicId, subTopicId, lessonId });
      this.toast.show('Unable to open lesson directly. Please use the Units view.', 'warning');
      return;
    }

    // 4. Navigate using the correct path structure
    // We use '../unit/...' because we are currently at 'kid/subject/:id/:gsId'
    this.router.navigate(['../unit', topicId, 'subtopic', subTopicId, 'lesson', lessonId], {
      relativeTo: this.route,
      state: {
        points: this.subjectPoints,
        subTopicTitle: lesson.name, // Passing this ensures the breadcrumb has a title
      },
    });
  }

  /**
   * Fetches the latest summary from backend and updates the points for this specific subject
   */
  refreshSubjectPoints(learnerId: string, gsId: string) {
    this.summaryService.getLearnerLessonSummary(learnerId).subscribe({
      next: (summary) => {
        // Find the subject in the array that matches our current GradeSubject ID
        const currentSummary = summary.subjects.find((s: SubjectSummary) => s.id === gsId);

        if (currentSummary) {
          // Update the points dynamically
          this.subjectPoints = currentSummary.points ?? 0;

          // Optional: Update local storage so it's fresh if the user hits refresh
          localStorage.setItem('subjectPoints', this.subjectPoints.toString());

          console.log(`Updated points for ${this.currentSubject.name}: ${this.subjectPoints}`);
        }
      },
      error: (err) => {
        console.error('Error fetching live points:', err);
      },
    });
  }

  loadTopics(gradeSubjectId: string) {
    this.isLoading = true;
    this.loadError = false;
    const learnerId = JSON.parse(localStorage.getItem('selectedLearner') || '{}').id || '';

    this.topicService.getTopicsByGradeSubject(gradeSubjectId).subscribe({
      next: (data: TopicSummary[]) => {
        // Track successful data load
        this.analyticsService.trackFeatureUsage('subject_topics_loaded_success', {
          grade_subject_id: gradeSubjectId,
          topics_count: data?.length || 0,
          learner_id: learnerId,
        });

        // 1. Check if the subject has no topics at all
        if (!data || data.length === 0) {
          this.units = [];
          this.isLoading = false;
          return;
        }

        const sortedTopics = data.sort((a, b) => a.orderIndex - b.orderIndex);
        this.currentSubject.description = `${sortedTopics.length} Units`;

        // For each topic, fetch its subtopics then lessons to check full completion
        const topicCompletionRequests = sortedTopics.map((topic) =>
          this.subTopicService
            .getSubTopicsByTopicId(topic.id)
            .pipe(catchError(() => of([])))
            .pipe(catchError(() => of([]))),
        );

        forkJoin(topicCompletionRequests).subscribe({
          next: (allSubTopics) => {
            // For each topic, check if all its subtopics have all lessons completed
            const lessonRequests = allSubTopics.map((subtopics) =>
              subtopics.length === 0
                ? of([]) // CHANGE: Changed from of(true) to of([]) to keep types consistent
                : forkJoin(
                    subtopics.map((st) =>
                      this.lessonService
                        .getLessonsBySubTopicId(st.id, learnerId)
                        .pipe(catchError(() => of([]))),
                    ),
                  ).pipe(catchError(() => of([]))),
            );

            forkJoin(lessonRequests).subscribe({
              next: (topicLessonsArrays) => {
                // We remove the "result === true" check because result is now always an array
                const topicCompletedFlags = topicLessonsArrays.map((result) => {
                  // Flatten the array (it handles empty arrays [] or nested arrays from forkJoin)
                  const allLessons = (result as any[]).flat();

                  // PROGRESSION LOGIC:
                  // If there are no lessons (empty topic), return true so it doesn't block the next unit.
                  // Otherwise, check if every lesson found is completed by the learner.
                  if (allLessons.length === 0) return true;

                  return allLessons.every((l: any) => l.learnerCompleted);
                });

                const mappedUnits: Unit[] = sortedTopics.map((topic, index) => {
                  // A unit is locked if the previous unit isn't complete
                  //const locked = index > 0 && !topicCompletedFlags[index - 1];
                  const locked = false;
                  const done = topicCompletedFlags[index];

                  // Pick a color. Using index % length ensures adjacent icons never accidentally get the exact same color!
                  const bgGradient = this.gradients[index % this.gradients.length];

                  return {
                    id: topic.id,
                    title: this.toTitleCase(topic.name), // <--- REMOVED "Unit X:" & APPLIED TITLE CASE
                    description: topic.description,
                    status: done ? 'completed' : 'in-progress',
                    subtopicsTotal: topic.subTopicCount,
                    subtopicsCompleted: 0,
                    decorationIcon: 'assets/icons/rocket.png',
                    iconBg: bgGradient, // <--- PASSED THE BACKGROUND COLOR
                  };
                });

                // Sort: Incomplete on top, Completed at bottom
                this.units = mappedUnits.sort((a, b) => {
                  if (a.status === 'completed' && b.status !== 'completed') return 1;
                  if (a.status !== 'completed' && b.status === 'completed') return -1;
                  return 0;
                });

                this.isLoading = false;

                // Trigger the resume point calculation
                this.findResumePoint(sortedTopics, allSubTopics, topicLessonsArrays);
              },

              error: (error) => {
                this.analyticsService.trackError(
                  'lesson_completion_check_failed',
                  error.message || 'Unknown error',
                  {
                    grade_subject_id: gradeSubjectId,
                    learner_id: learnerId,
                    topics_count: sortedTopics.length,
                  },
                );
                this.isLoading = false;
                this.loadError = true;
              },
            });
          },
          error: (error) => {
            this.analyticsService.trackError(
              'subtopics_load_failed',
              error.message || 'Unknown error',
              {
                grade_subject_id: gradeSubjectId,
                learner_id: learnerId,
              },
            );
            this.isLoading = false;
            this.loadError = true;
          },
        });
      },
      error: (err) => {
        console.error('Error fetching topics', err);
        this.analyticsService.trackError('topics_load_failed', err.message || 'Unknown error', {
          grade_subject_id: gradeSubjectId,
          learner_id: learnerId,
          error_status: err.status,
          error_code: err.code,
        });
        this.loadError = true;
        this.isLoading = false;
        this.toast.show("Couldn't load units. Please try again.", 'error');
      },
    });
  }

  // Add this helper method
  // Update the parameter type to any[] to be more flexible
  findResumePoint(topics: any[], subTopicsArray: any[][], lessonsArray: any[]) {
    try {
      // 1. Find the first incomplete topic index
      const incompleteTopicIdx = topics.findIndex((_, idx) => {
        // Flatten the lessons for this specific topic
        const topicData = lessonsArray[idx];

        // If it's not an array or is empty, it's technically "incomplete" (needs work)
        if (!Array.isArray(topicData) || topicData.length === 0) return true;

        const allLessonsInTopic = topicData.flat();
        return (
          allLessonsInTopic.length === 0 || allLessonsInTopic.some((l: any) => !l.learnerCompleted)
        );
      });

      const targetTopicIdx = incompleteTopicIdx === -1 ? 0 : incompleteTopicIdx;
      const targetTopic = topics[targetTopicIdx];

      // 2. Find first incomplete subtopic in that topic
      const subTopicsInTarget = subTopicsArray[targetTopicIdx] || [];
      const subTopicLessons = (lessonsArray[targetTopicIdx] as any[]) || [];

      const incompleteSubTopicIdx = subTopicsInTarget.findIndex((_, stIdx) => {
        const lessons = subTopicLessons[stIdx] || [];
        return lessons.length === 0 || lessons.some((l: any) => !l.learnerCompleted);
      });

      const targetSubTopicIdx = incompleteSubTopicIdx === -1 ? 0 : incompleteSubTopicIdx;
      const targetSubTopic = subTopicsInTarget[targetSubTopicIdx];

      // 3. Find first incomplete lesson in that subtopic
      const lessonsInTarget = subTopicLessons[targetSubTopicIdx] || [];
      // Target the first incomplete one, or fallback to the very first lesson if all are done
      const incompleteLesson =
        lessonsInTarget.find((l: any) => !l.learnerCompleted) || lessonsInTarget[0];

      if (targetTopic && targetSubTopic && incompleteLesson) {
        this.resumeData = {
          unitId: targetTopic.id,
          subTopicId: targetSubTopic.id,
          lessonId: incompleteLesson.id,
          subTopicName: targetSubTopic.name,
        };
        console.log('Resume point identified:', this.resumeData);
      }
    } catch (e) {
      console.error('Could not determine resume point', e);
    }
  }

  onResumeLearning() {
    if (!this.resumeData) return;

    const subjectSlug = this.route.snapshot.params['subjectId'];

    // Clean the subtopic name for state (removing "1. " if it exists)
    const cleanName = this.resumeData.subTopicName.includes('.')
      ? this.resumeData.subTopicName.split('.')[1].trim()
      : this.resumeData.subTopicName;

    // Navigate straight to the content page
    this.router.navigate(
      [
        '/kid/subject',
        subjectSlug,
        'unit',
        this.resumeData.unitId,
        'subtopic',
        this.resumeData.subTopicId,
        'lesson',
        this.resumeData.lessonId,
      ],
      {
        state: {
          points: this.subjectPoints,
          subTopicTitle: cleanName,
        },
      },
    );
  }

  loadSubjectPoints(gsId: string) {
    const storedPoints = localStorage.getItem('subjectPoints');
    this.subjectPoints = storedPoints ? +storedPoints : 0;
  }

  calculateProgress(completed: number, total: number): number {
    return (completed / total) * 100;
  }

  // Use relative navigation to go back up to the main dashboard
  goBack() {
    this.analyticsService.trackButtonClick('back_from_subject', {
      subject_name: this.currentSubject.name,
      units_available: this.units.length,
    });
    this.location.back();
  }

  onSelectUnit(unit: Unit, index: number) {
    const learnerData = localStorage.getItem('selectedLearner');
    const learner = learnerData ? JSON.parse(learnerData) : null;

    // if (unit.status === 'locked') {
    //   this.analyticsService.trackFeatureUsage('locked_unit_clicked', {
    //     unit_title: unit.title,
    //     unit_index: index,
    //     subject_name: this.currentSubject.name,
    //     learner_id: learner?.id,
    //   });
    //   this.toast.show('Complete the previous unit first.', 'warning');
    //   return;
    // }

    // Track unit selection
    this.analyticsService.trackFeatureUsage('unit_selected', {
      unit_title: unit.title,
      unit_index: index,
      unit_status: unit.status,
      subject_name: this.currentSubject.name,
      subtopics_total: unit.subtopicsTotal,
      subtopics_completed: unit.subtopicsCompleted,
      learner_id: learner?.id,
      learner_name: learner?.firstName,
    });

    const topicId = unit.id;
    localStorage.setItem('currentUnitName', unit.title);
    this.router.navigate(['../unit', topicId], {
      relativeTo: this.route,
      state: {
        subjectName: this.currentSubject.name,
        unitNumber: index + 1,
        topicTitle: unit.title,
        points: this.subjectPoints,
      },
    });
  }
}
