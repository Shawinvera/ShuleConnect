import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { Router, ActivatedRoute } from '@angular/router';
import { SubTopicService, SubTopicSummary } from '../../services/sub-topic/sub-topic';
import { LessonService, LessonSummary } from '../../services/lesson/lesson';
import { Location } from '@angular/common';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { KidBreadcrumbComponent } from '../breadcrumb/kid-breadcrumb';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../shared/services/toast.service';
import { LearnerService } from '../../services/learner/learner';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LearnersSummary, SubjectSummary } from '../../services/learners-summary/learners-summary';
import { LessonCard } from '../../reusable/lesson-card/lesson-card';
// Define Data Structures
interface Lesson {
  id: string; // Added ID for navigation
  title: string;
  description: string;
  type: string;
  time: string;
  status: string;
  iconBg: string;
  orderIndex: number;
}

interface UnitData {
  title: string;
  subtitle: string;
  lessons: Lesson[];
}

@Component({
  selector: 'app-lesson-unit',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    SpinnerOverlayComponent,
    KidBreadcrumbComponent,
    ToastNotificationComponent,
    LessonCard,
  ],
  templateUrl: './lesson-unit.html',
  styleUrl: './lesson-unit.css',
})
export class LessonUnit implements OnInit {
  subjectPoints: number = 0;
  topicTitle: string = '';
  breadcrumbSubject: string = '';
  unitNumber: number = 0;
  showAllLessons = true; // Toggle state
  allTopicLessons: LessonSummary[] = []; // Store for the global list of lessons in this topic
  isLessonsLoading = false;
  currentSubjectIcon: string = 'assets/subject-icons/maths.png';
  activeTopicLessons: LessonSummary[] = [];
  completedTopicLessons: LessonSummary[] = [];

  // Implement OnInit

  // Dynamic Data Containers
  currentUnit: UnitData = {
    title: 'Loading...',
    subtitle: 'Preparing lessons',
    lessons: [],
  };
  isLoading = false;
  loadError = false;

  selectedLesson: any = null;

  // --- ADDED GRADIENTS & FORMATTER ---
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

  private toTitleCase(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private subTopicService: SubTopicService,
    private lessonService: LessonService,
    private location: Location,
    public toast: ToastService,
    private learnerService: LearnerService,
    private summaryService: LearnersSummary,
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.subjectPoints = navigation.extras.state['points'] || 0;
      localStorage.setItem('subjectPoints', this.subjectPoints.toString());
      this.breadcrumbSubject = navigation.extras.state['subjectName'] || '';
      this.unitNumber = navigation.extras.state['unitNumber'] || 0;
      this.currentSubjectIcon =
        localStorage.getItem('currentSubjectIcon') || 'assets/subject-icons/maths.png';

      // 1. GET the full title (e.g., "Unit 1: INDICES")
      const fullTitle = navigation.extras.state['topicTitle'] || '';

      // 2. STRIP the "Unit X:" prefix
      // This splits the string at the colon and takes the second part [1]
      if (fullTitle.includes(':')) {
        this.topicTitle = fullTitle.split(':')[1].trim();
      } else {
        this.topicTitle = fullTitle;
      }

      // Update the unit object title for internal tracking
      this.currentUnit.title = this.topicTitle;
    } else {
      // Fallback when coming back
      const storedPoints = localStorage.getItem('subjectPoints');
      this.subjectPoints = storedPoints ? +storedPoints : 0;
    }
  }

  ngOnInit() {
    //Clean the unit name in local storage for the breadcrumb
    const storedUnitName = localStorage.getItem('currentUnitName');
    if (storedUnitName && storedUnitName.includes(':')) {
      localStorage.setItem('currentUnitName', storedUnitName.split(':')[1].trim());
    }
    // Get the Unit ID from the URL
    this.route.paramMap.subscribe((params) => {
      const topicId = params.get('unitId');
      const gsId = params.get('gsId');

      // Fallback for Subject Name if page is refreshed (state is lost on hard refresh)
      if (!this.breadcrumbSubject && gsId) {
        this.breadcrumbSubject = gsId.charAt(0).toUpperCase() + gsId.slice(1);
      }

      if (topicId) {
        this.loadSubTopics(topicId);
      }
      if (gsId) {
        this.refreshPoints(gsId);
      }
    });
  }

  loadSubTopics(topicId: string) {
    this.isLoading = true;
    this.loadError = false;
    const learnerId = JSON.parse(localStorage.getItem('selectedLearner') || '{}').id || '';

    this.subTopicService.getSubTopicsByTopicId(topicId).subscribe({
      next: (data: SubTopicSummary[]) => {
        // 1. Handle case where topic exists but has no subtopics
        if (!data || data.length === 0) {
          this.currentUnit = {
            title: this.topicTitle || 'Unit Lessons',
            subtitle: '0 lessons available',
            lessons: [],
          };
          this.isLoading = false;
          return;
        }

        // Fetch lesson completion for each subtopic in parallel
        const lessonRequests = data.map((st) =>
          this.lessonService
            .getLessonsBySubTopicId(st.id, learnerId)
            .pipe(catchError(() => of([]))),
        );

        forkJoin(lessonRequests).subscribe({
          next: (allLessons) => {
            // // Flatten all lessons into one array for the "All Lessons" view
            // this.allTopicLessons = allLessons.flat().sort((a, b) => {
            //   if (a.subTopicOrderIndex !== b.subTopicOrderIndex) {
            //     return a.subTopicOrderIndex - b.subTopicOrderIndex;
            //   }
            //   return a.orderIndex - b.orderIndex;
            // });

            const flattened = allLessons.flat().sort((a, b) => {
              if (a.subTopicOrderIndex !== b.subTopicOrderIndex)
                return a.subTopicOrderIndex - b.subTopicOrderIndex;
              return a.orderIndex - b.orderIndex;
            });

            this.activeTopicLessons = flattened.filter((l) => !l.learnerCompleted);
            this.completedTopicLessons = flattened.filter((l) => l.learnerCompleted);

            const completedFlags = allLessons.map(
              (lessons) => lessons.length > 0 && lessons.every((l) => l.learnerCompleted),
            );

            const mappedLessons: Lesson[] = data
              .map((st, index) => {
                // const locked = index > 0 && !completedFlags[index - 1];
                const locked = false;
                const allDone = completedFlags[index];

                // Pick a background gradient based on index
                const bgGradient = this.gradients[index % this.gradients.length];

                return {
                  id: st.id,
                  title: this.toTitleCase(st.name), // <-- REMOVED `${index + 1}. ` AND ADDED TITLE CASE
                  description: st.description,
                  type: 'Lessons',
                  time: `${st.lessonCount} parts`,
                  status: allDone ? 'Complete' : 'Start',
                  iconBg: this.gradients[index % this.gradients.length], // <-- PASSED THE GRADIENT COLOR
                  orderIndex: st.orderIndex,
                };
              })
              .sort((a, b) => a.orderIndex - b.orderIndex);

            // --- QUIZ LOGIC COMMENTED OUT ---
            // const allSubtopicsDone = completedFlags.every(Boolean);
            // mappedLessons.push({
            //   id: 'quiz',
            //   title: 'Unit Quiz',
            //   description: 'Test your knowledge!',
            //   type: 'Quiz',
            //   time: '',
            //   status: allSubtopicsDone ? 'Start' : 'Locked',
            //   iconBg: 'bg-[#C999F5]'
            // });
            //

            // ADD THIS SORTING LOGIC:
            // this.currentUnit = {
            //   title: this.topicTitle || 'Unit Lessons',
            //   subtitle: `${data.length} lessons to master`,
            //   lessons: mappedLessons.sort((a, b) => {
            //     // "Complete" items go to the bottom (return 1)
            //     if (a.status === 'Complete' && b.status !== 'Complete') return 1;
            //     if (a.status !== 'Complete' && b.status === 'Complete') return -1;
            //     return 0;
            //   }),
            // };
            this.currentUnit.lessons = mappedLessons;
            this.isLoading = false;
          },
          error: () => {
            this.isLoading = false;
            this.loadError = true;
          },
        });
      },
      error: (err) => {
        console.error('Error fetching subtopics', err);
        this.isLoading = false;
        this.loadError = true;
      },
    });
  }

  // Add Toggle Method
  toggleView() {
    this.showAllLessons = !this.showAllLessons;
  }

  // Handle clicking a lesson from the grid
  onSelectGlobalLesson(lesson: LessonSummary) {
    const subTopicId = lesson.subTopicId;
    const topicId = this.route.snapshot.params['unitId'];

    this.router.navigate(['subtopic', subTopicId, 'lesson', lesson.id], {
      relativeTo: this.route,
      state: {
        points: this.subjectPoints,
        subTopicTitle: lesson.name,
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
      // Fallback to local storage if learnerId isn't found
      const storedPoints = localStorage.getItem('subjectPoints');
      this.subjectPoints = storedPoints ? +storedPoints : 0;
    }
  }

  goBack() {
    this.location.back();
  }

  // --- Logic ---

  /** Handle Card Click */
  selectLesson(lesson: any) {
    // Prevent selecting locked lessons if desired
    if (lesson.status === 'Locked' && !this.isQuiz(lesson)) return;

    this.selectedLesson = lesson;
  }

  isQuiz(lesson: any): boolean {
    return lesson.title.includes('Unit Quiz');
  }

  getImage(lesson: any): string {
    if (this.isQuiz(lesson)) return 'assets/icons/cup.png';
    if (lesson.status === 'Complete') return 'assets/icons/tick.png';
    if (lesson.status === 'Locked') return 'assets/icons/lock.png';
    return 'assets/icons/video.png';
  }

  getIconBgClass(lesson: any): string {
    if (this.isQuiz(lesson)) return 'bg-[#C999F5]';
    if (lesson.status === 'Complete') return 'bg-[#B3F6D1]';
    if (lesson.status === 'Locked') return 'bg-red-300';
    return 'bg-[#EAD09B]';
  }

  getIconColorClass(lesson: any): string {
    if (this.isQuiz(lesson)) return 'text-[#a855f7]';
    if (lesson.status === 'Complete') return 'text-[#2ac769]';
    if (lesson.status === 'Locked') return 'text-gray-500';
    return 'text-orange-600';
  }

  /** Returns border color ONLY for the selected item */
  getBorderColor(lesson: any): string {
    if (this.isQuiz(lesson)) return '#C999F5'; // Purple
    if (lesson.status === 'Complete') return '#16A34A'; // Green
    if (lesson.status === 'Locked') return '#BABABA'; // Grey
    return '#EAD09B'; // Yellow/Orange
  }

  getStatusColor(lesson: any): string {
    if (lesson.status === 'Complete') return 'text-[#22c55e]';
    if (lesson.status === 'Start') return 'text-orange-500';
    if (lesson.status === 'Locked') return 'text-red-500';
    return 'text-gray-400';
  }

  onSelectLesson(subTopic: Lesson) {
    // const subTopicId = subTopic.id;
    // localStorage.setItem('currentSubTopicName', subTopic.title);

    // if (subTopic.status === 'Locked' && !this.isQuiz(subTopic)) {
    //   console.log('This lesson is currently locked');
    //   return;
    // }

    // Store ordered subtopic list so unit-content can navigate to next subtopic
    // const subtopicList = this.currentUnit.lessons
    //   .filter((l) => !this.isQuiz(l))
    //   .map((l) => ({ id: l.id, name: l.title }));
    localStorage.setItem('currentSubTopicName', subTopic.title);
    const subtopicList = this.currentUnit.lessons.map((l) => ({ id: l.id, name: l.title }));
    localStorage.setItem('currentSubtopicList', JSON.stringify(subtopicList));

    this.router.navigate(['subtopic', subTopic.id], {
      relativeTo: this.route,
      state: {
        subjectName: this.breadcrumbSubject,
        unitTitle: this.currentUnit.title,
        points: this.subjectPoints,
        subTopicTitle: subTopic.title,
        unitNumber: this.unitNumber,
      },
    });
  }
}
