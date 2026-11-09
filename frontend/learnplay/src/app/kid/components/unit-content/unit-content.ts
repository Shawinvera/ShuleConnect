import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router, ActivatedRoute } from '@angular/router';
import { CustomVideoPlayerComponent } from '../../../shared/components/custom-video-player/custom-video-player.component';
import { LessonService, LessonSummary } from '../../services/lesson/lesson';
import { Location } from '@angular/common';
import confetti from 'canvas-confetti';
import {
  MarkCompletedService,
  LessonTrackerDto,
} from '../../services/mark-completed/mark-completed';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { KidBreadcrumbComponent } from '../breadcrumb/kid-breadcrumb';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../shared/services/toast.service';
import { TopicService } from '../../services/topic/topic';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PosthogService } from '../../../services/posthog.service';
import { AnalyticsService } from '../../../services/analytics.service';
import { LearnersSummary } from '../../services/learners-summary/learners-summary';
import { LearnerService } from '../../services/learner/learner';
import { LearningHistory } from '../../services/learning-history/learning-history';
import { ChoosePlan } from '../../reusable/choose-plan/choose-plan';
import { PaymentMethod, Plan } from '../../reusable/payment-method/payment-method';

@Component({
  selector: 'app-unit-content',
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    CustomVideoPlayerComponent,
    SpinnerOverlayComponent,
    KidBreadcrumbComponent,
    ToastNotificationComponent,
    ChoosePlan,
    PaymentMethod,
  ],
  templateUrl: './unit-content.html',
  styleUrl: './unit-content.css',
})
export class UnitContent implements OnInit {
  currentStep: 'plan-selection' | 'payment' | 'content' = 'content';
  selectedPlan: Plan | null = null;
  isSubscriptionActive: boolean = true;
  currentLessonId: string = '';
  learnerId: string = '';
  isLoading = false;
  loadError = false;
  allLessons: LessonSummary[] = [];
  currentIndex: number = 0;
  hasNotes: boolean = false;
  awardedPoints: number = 0;
  isLoadingPoints: boolean = false;
  showPaymentNoticeModal = false;
  isNotesExpanded: boolean = false;
  // Data Holder
  contentData = {
    title: 'Loading...',
    videoTitle: '',
    videoId: '',
    duration: 0,
  };

  /** TinyMCE HTML from admin; bypasses sanitizer so alignment / lists match the editor. */
  lessonNotesHtml: SafeHtml = '';

  isLessonComplete = false;
  isVideoPlaying = false;
  isRevisionMode = false;
  showSuccessModal = false;
  isSubmitting = false;
  lessonStartTime: number = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private lessonService: LessonService,
    private location: Location,
    private markCompletedService: MarkCompletedService,
    public toast: ToastService,
    private topicService: TopicService,
    private domSanitizer: DomSanitizer,
    private posthogService: PosthogService,
    private analyticsService: AnalyticsService,
    private summaryService: LearnersSummary, // <--- ADD THIS
    private learnerService: LearnerService,
    private historyService: LearningHistory,
  ) {}

  ngOnInit() {
    this.checkSubscriptionStatus();
    // 1. Get Learner ID from storage (saved during learner selection)
    const learnerData = localStorage.getItem('selectedLearner');
    if (learnerData) {
      this.learnerId = JSON.parse(learnerData).id;
    }

    this.route.paramMap.subscribe((params) => {
      const subTopicId = params.get('subTopicId'); // Get the subtopic ID from parent
      const lessonIdFromUrl = params.get('lessonId'); // Get specific lesson

      if (subTopicId) {
        this.isLoading = true;
        this.loadError = false;
        const startTime = Date.now();

        const learnerId = JSON.parse(localStorage.getItem('selectedLearner') || '{}').id || '';
        this.lessonService.getLessonsBySubTopicId(subTopicId, learnerId).subscribe({
          next: (lessons) => {
            const responseTime = Date.now() - startTime;

            // Track successful lesson load
            this.analyticsService.trackApiCall(
              'getLessonsBySubTopicId',
              'GET',
              true,
              responseTime,
              {
                subtopic_id: subTopicId,
                lessons_count: lessons?.length || 0,
                learner_id: learnerId,
              },
            );

            if (!lessons || lessons.length === 0) {
              this.allLessons = [];
              this.isLoading = false;
              this.analyticsService.trackUserExperience('no_lessons_found', {
                subtopic_id: subTopicId,
                learner_id: learnerId,
              });
              return;
            }
            this.allLessons = lessons.sort((a, b) => a.orderIndex - b.orderIndex);
            const startIdx = this.allLessons.findIndex((l) => l.id === lessonIdFromUrl);
            this.displayLesson(startIdx >= 0 ? startIdx : 0);

            this.analyticsService.trackSuccess('lessons_loaded', {
              subtopic_id: subTopicId,
              lessons_count: this.allLessons.length,
              load_time_ms: responseTime,
              starting_lesson_index: startIdx >= 0 ? startIdx : 0,
            });

            this.isLoading = false;
          },
          error: (err) => {
            const responseTime = Date.now() - startTime;
            console.error('Error fetching lessons:', err);

            this.analyticsService.trackError(
              'lessons_load_failed',
              err.message || 'Unknown error',
              {
                subtopic_id: subTopicId,
                learner_id: learnerId,
                error_status: err.status,
                response_time_ms: responseTime,
              },
            );

            this.loadError = true;
            this.isLoading = false;
          },
        });
      }
    });
  }

  toggleNotesExpansion() {
    this.isNotesExpanded = !this.isNotesExpanded;

    // Prevent background scrolling when notes are fullscreen on mobile
    if (this.isNotesExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }

  checkSubscriptionStatus() {
    const data = localStorage.getItem('selectedLearner');
    if (data) {
      const learner = JSON.parse(data);
      this.isSubscriptionActive = this.learnerService.isSubscriptionActive(
        learner.subscriptionExpiryDate,
      );

      if (!this.isSubscriptionActive) {
        this.showPaymentNoticeModal = true; // Show notice modal on load
        this.currentStep = 'content'; // Stay on content view but blocked
        //document.body.style.overflow = 'hidden';
      } else {
        this.showPaymentNoticeModal = false;
        this.currentStep = 'content';
        document.body.style.overflow = 'auto';
      }
    }
  }

  // Triggered when user clicks "Proceed to Pay" in the notice modal
  startPaymentFlow() {
    this.showPaymentNoticeModal = false;
    this.currentStep = 'plan-selection';
  }

  // Triggered if user tries to interact with blocked content
  onBlockedClick() {
    if (!this.isSubscriptionActive && this.currentStep === 'content') {
      this.showPaymentNoticeModal = true;
    }
  }

  // --- PAYMENT METHODS (from KidsDashboard) ---
  onPlanSelected(plan: Plan) {
    this.selectedPlan = plan;
    if (this.selectedPlan) {
      this.currentStep = 'payment';
    }
  }

  onPaymentSuccess() {
    this.isSubscriptionActive = true;
    this.currentStep = 'content';
    //document.body.style.overflow = 'auto';
    // Optionally refresh learner data in local storage here
    this.toast.show('Subscription activated! Enjoy your lesson.', 'success');
  }

  returnToPlans() {
    this.currentStep = 'plan-selection';
    this.selectedPlan = null;
  }

  // Ensure scrolling is restored if they leave the page
  ngOnDestroy() {
    //document.body.style.overflow = 'auto';
  }

  loadLessonData(subTopicId: string) {
    this.isLoading = true;
    const lessonIdFromUrl = this.route.snapshot.paramMap.get('lessonId');
    this.lessonService.getLessonsBySubTopicId(subTopicId).subscribe({
      // next: (lessons: LessonSummary[]) => {
      //   if (lessons.length > 0) {
      //     this.allLessons = lessons.sort((a, b) => (a as any).orderIndex - (b as any).orderIndex);
      //     this.displayLesson(0);
      //   }
      //   this.isLoading = false;
      // },
      next: (lessons) => {
        if (!lessons || lessons.length === 0) {
          this.allLessons = [];
          this.isLoading = false;
          return;
        }

        // Ensure strict numerical order for the "Next" button logic
        this.allLessons = lessons.sort((a, b) => a.orderIndex - b.orderIndex);

        const startIdx = this.allLessons.findIndex((l) => l.id === lessonIdFromUrl);
        this.displayLesson(startIdx >= 0 ? startIdx : 0);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading lessons', err);
        this.loadError = true;
        this.isLoading = false;
        this.toast.show("Couldn't load lesson content. Please try again.", 'error');
      },
    });
  }

  // Helper method to update the screen with a specific lesson from our list
  displayLesson(index: number) {
    this.currentIndex = index;
    const lesson = this.allLessons[index];
    this.currentLessonId = lesson.id;
    this.lessonStartTime = Date.now();

    // Track lesson start
    const learnerData = localStorage.getItem('selectedLearner');
    const learner = learnerData ? JSON.parse(learnerData) : null;

    this.analyticsService.trackLessonStart(
      lesson.id,
      lesson.name,
      localStorage.getItem('currentSubjectName') || 'Unknown Subject',
    );

    localStorage.setItem('currentLessonPartName', lesson.name);

    this.isLessonComplete = lesson.learnerCompleted;
    this.showSuccessModal = false;
    this.isVideoPlaying = false;
    // If lesson was already completed before, go straight to revision mode
    this.isRevisionMode = lesson.learnerCompleted;

    // 1. Extract Video ID (Interface will be hidden if this is empty)
    const vId = this.extractYouTubeId(lesson.videoUrl);

    this.contentData = {
      title: lesson.name,
      videoTitle: lesson.name,
      videoId: vId,
      duration: lesson.duration,
    };

    // 2. Handle Lesson Notes (Interface will be hidden if hasNotes is false)
    const rawHtml = (lesson.content || '').trim();

    this.hasNotes = rawHtml.length > 0;

    if (this.hasNotes) {
      const merged = rawHtml.replace(/\n+(?=<)/g, '');
      this.lessonNotesHtml = this.domSanitizer.bypassSecurityTrustHtml(merged);
    } else {
      this.lessonNotesHtml = '';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  formatDuration(minutes: number): string {
    if (!minutes) return '0:00'; // Handle cases where duration might be null/undefined

    const totalMinutes = Math.floor(minutes);
    const seconds = Math.floor((minutes - totalMinutes) * 60); // If duration is in minutes from backend
    // OR if duration is already in seconds from backend, just use:
    // const totalSeconds = Math.floor(minutes); // Use this if backend sends total seconds

    const minutesPart = totalMinutes.toString().padStart(2, '0');
    const secondsPart = seconds.toString().padStart(2, '0');

    return `${minutesPart}:${secondsPart}`;
  }

  private extractYouTubeId(url: string): string {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);

    // Check if match exists and the ID group [2] is the correct YouTube ID length (11)
    if (match && match[2] && match[2].length === 11) {
      return match[2];
    } else {
      return '';
    }
  }

  markAsComplete() {
    if (this.isSubmitting || this.isRevisionMode) return;
    this.isSubmitting = true;

    const timeSpent = Math.round((Date.now() - this.lessonStartTime) / 1000);
    const learnerData = localStorage.getItem('selectedLearner');
    const learner = learnerData ? JSON.parse(learnerData) : null;

    const payload: LessonTrackerDto = {
      learnerId: this.learnerId,
      lessonId: this.currentLessonId,
    };

    this.markCompletedService.markAsComplete(payload).subscribe({
      next: (response) => {
        // Mark current lesson as completed in local array
        this.allLessons[this.currentIndex].learnerCompleted = true;
        this.isLessonComplete = true;
        this.showSuccessModal = true;

        this.isLoadingPoints = true;
        this.historyService.getHistory(this.learnerId).subscribe({
          next: (history) => {
            // Find the history item for the lesson we just finished
            const latestEntry = history.find((h) => h.lessonId === this.currentLessonId);
            this.awardedPoints = latestEntry ? latestEntry.points : 0;
            this.isLoadingPoints = false;
          },
          error: (err) => {
            console.error('Failed to fetch points from history', err);
            this.isLoadingPoints = false;
          },
        });

        // 2. REFRESH LEARNER SUMMARY / POINTS
        this.summaryService.getLearnerLessonSummary(this.learnerId).subscribe({
          next: (summary) => {
            const gsId = localStorage.getItem('currentGsId');
            const subjectSummary = summary.subjects?.find((s: any) => s.id === gsId);
            if (subjectSummary) {
              localStorage.setItem('subjectPoints', (subjectSummary.points ?? 0).toString());
            }

            // Emit a custom event to notify the main dashboard to refresh
            window.dispatchEvent(
              new CustomEvent('lessonCompleted', {
                detail: {
                  learnerId: this.learnerId,
                  lessonId: this.currentLessonId,
                  subjectId: gsId,
                },
              }),
            );
          },
          error: (err) => console.error('Failed to refresh summary points', err),
        });

        // Track lesson completion with comprehensive data
        this.analyticsService.trackLessonComplete(
          this.currentLessonId,
          this.contentData.title,
          localStorage.getItem('currentSubjectName') || 'Unknown Subject',
          timeSpent,
        );

        this.posthogService.posthog.capture('lesson_completed', {
          lesson_id: this.currentLessonId,
          lesson_title: this.contentData.title,
          lesson_index: this.currentIndex,
          learner_id: this.learnerId,
          learner_name: learner?.firstName,
          time_spent_seconds: timeSpent,
          has_video: !!this.contentData.videoId,
          has_notes: this.hasNotes,
          subject_name: localStorage.getItem('currentSubjectName'),
          unit_name: localStorage.getItem('currentUnitName'),
        });

        this.playSuccessSound();
        this.launchConfetti();
        this.isRevisionMode = true;
        this.isSubmitting = false;
      },
      error: (err) => {
        console.error('Failed to update backend', err);
        this.analyticsService.trackError(
          'lesson_completion_failed',
          err.message || 'Unknown error',
          {
            lesson_id: this.currentLessonId,
            learner_id: this.learnerId,
          },
        );
        this.isSubmitting = false;
        this.toast.show("Couldn't save your progress. Please try again.", 'error');
      },
    });
  }

  goToNextLesson() {
    this.analyticsService.trackButtonClick('next_lesson', {
      current_lesson_id: this.currentLessonId,
      current_lesson_title: this.contentData.title,
      lesson_index: this.currentIndex,
      total_lessons: this.allLessons.length,
    });

    this.showSuccessModal = false;

    if (this.currentIndex < this.allLessons.length - 1) {
      // More lessons in this subtopic
      const nextLesson = this.allLessons[this.currentIndex + 1];
      this.router.navigate(['../', nextLesson.id], { relativeTo: this.route });
      this.displayLesson(this.currentIndex + 1);
    } else {
      // Last lesson — try to navigate to next subtopic
      const subtopics: any[] = JSON.parse(localStorage.getItem('currentSubtopicList') || '[]');
      const currentSubTopicId = this.route.snapshot.params['subTopicId'];
      const currentSubTopicIndex = subtopics.findIndex((s) => s.id === currentSubTopicId);

      if (currentSubTopicIndex !== -1 && currentSubTopicIndex < subtopics.length - 1) {
        // Navigate to next subtopic's lesson list
        const nextSubTopic = subtopics[currentSubTopicIndex + 1];
        const subjectId = this.route.snapshot.params['subjectId'];
        const unitId = this.route.snapshot.params['unitId'];
        this.router.navigate(
          ['/kid/subject', subjectId, 'unit', unitId, 'subtopic', nextSubTopic.id],
          { state: { subTopicTitle: nextSubTopic.name } },
        );
      } else {
        // Last subtopic: do not use history.back() — each "Next lesson" pushed a URL, so going
        // back twice only walks those lesson entries (often landing on lesson 1). Navigate explicitly.
        this.navigateAfterLastSubtopicOfTopic();
      }
    }
  }

  /** After the final lesson of the final subtopic in this topic (unit), go to the next topic or subject list. */
  private navigateAfterLastSubtopicOfTopic(): void {
    const subjectSlug = this.route.snapshot.params['subjectId'];
    const unitId = this.route.snapshot.params['unitId'];
    const gsId = localStorage.getItem('currentGsId') || '';
    const subjectName =
      localStorage.getItem('currentSubjectName') ||
      (subjectSlug ? subjectSlug.charAt(0).toUpperCase() + subjectSlug.slice(1) : 'Subject');
    const points = +(localStorage.getItem('subjectPoints') || '0');

    if (!gsId) {
      this.router.navigate(['/kid/subject', subjectSlug, 'unit', unitId], {
        state: {
          subjectName,
          unitNumber: 1,
          topicTitle: localStorage.getItem('currentUnitName') || '',
          points,
        },
      });
      return;
    }

    this.topicService.getTopicsByGradeSubject(gsId).subscribe({
      next: (topics) => {
        const sorted = [...topics].sort((a, b) => a.orderIndex - b.orderIndex);
        const idx = sorted.findIndex((t) => t.id === unitId);
        if (idx !== -1 && idx < sorted.length - 1) {
          const next = sorted[idx + 1];
          const topicTitle = `Unit ${idx + 2}: ${next.name}`;
          this.router.navigate(['/kid/subject', subjectSlug, 'unit', next.id], {
            state: {
              subjectName,
              unitNumber: idx + 2,
              topicTitle,
              points,
            },
          });
        } else {
          this.router.navigate(['/kid/subject', subjectSlug, gsId], {
            state: { points },
          });
        }
      },
      error: () => {
        this.router.navigate(['/kid/subject', subjectSlug, 'unit', unitId], {
          state: {
            subjectName,
            unitNumber: 1,
            topicTitle: localStorage.getItem('currentUnitName') || '',
            points,
          },
        });
      },
    });
  }

  closeModal() {
    this.showSuccessModal = false;
  }

  // 3. Logic to play the audio
  private playSuccessSound() {
    const audio = new Audio();
    audio.src = 'assets/sounds/clap.mp3'; // Path to your sound file
    audio.load();
    audio.play().catch((err) => console.log('Audio play failed (User must interact first):', err));
  }

  private launchConfetti() {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      // 1. Left side of the fountain (Shooting from center towards top-left)
      confetti({
        particleCount: 12,
        angle: 105, // Slightly tilted left
        spread: 50,
        origin: { x: 0.5, y: 1 }, // Bottom Center
        startVelocity: 85, // High velocity to reach 3/4 of the screen
        gravity: 0.8, // Lower gravity so they "float" more
        scalar: 1.2,
        colors: ['#9333EA', '#4ADE80', '#FAC815', '#687AE4', '#FF0000'],
      });

      // 2. Right side of the fountain (Shooting from center towards top-right)
      confetti({
        particleCount: 12,
        angle: 75, // Slightly tilted right
        spread: 50,
        origin: { x: 0.5, y: 1 }, // Bottom Center
        startVelocity: 85, // Matches left side for symmetry
        gravity: 0.8,
        scalar: 1.2,
        colors: ['#9333EA', '#4ADE80', '#FAC815', '#687AE4', '#FF0000'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    // One massive high-altitude burst to start the celebration
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { x: 0.5, y: 1 },
      angle: 90,
      startVelocity: 95, // Even higher burst for the start
      gravity: 0.7,
      ticks: 200,
    });

    frame();
  }
  // 4. Logic to launch confetti

  resetLesson() {
    this.isLessonComplete = false;
  }

  playVideo() {
    this.analyticsService.trackFeatureUsage('video_played', {
      lesson_id: this.currentLessonId,
      lesson_title: this.contentData.title,
      video_id: this.contentData.videoId,
      learner_id: this.learnerId,
    });
    this.isVideoPlaying = true;
  }

  onVideoReady() {
    console.log('Video is ready to play');
  }

  onVideoStateChange(state: number) {
    // YouTube Player States: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
    console.log('Video state changed:', state);
  }

  goBack() {
    this.analyticsService.trackButtonClick('back_from_lesson', {
      lesson_id: this.currentLessonId,
      lesson_title: this.contentData.title,
      lesson_completed: this.isLessonComplete,
      time_on_lesson: Math.round((Date.now() - this.lessonStartTime) / 1000),
    });
    this.location.back(); // This takes you back to the units list exactly as it was
  }

  /** Button label when in revision mode (completed lesson). */
  get nextLessonButtonLabel(): string {
    if (this.currentIndex < this.allLessons.length - 1) {
      return 'Next Lesson';
    }
    const subtopics: { id: string }[] = JSON.parse(
      localStorage.getItem('currentSubtopicList') || '[]',
    );
    const currentSubTopicId = this.route.snapshot.params['subTopicId'];
    const i = subtopics.findIndex((s) => s.id === currentSubTopicId);
    const lastSubtopic = i === -1 || i === subtopics.length - 1;
    return lastSubtopic ? 'Next Topic' : 'Next Sub-Topic';
  }
}
