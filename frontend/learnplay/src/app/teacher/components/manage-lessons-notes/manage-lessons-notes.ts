import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TeacherService } from '../../services/teacher.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../services/notification.service';
import { NotificationComponent } from '../../../shared/components/notification/notification.component';
import { EditorModule } from '@tinymce/tinymce-angular';
import { localGet } from '../../../shared/components/utils/local-storage.util';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { TeacherBreadcrumbComponent } from '../breadcrumb/teacher-breadcrumb';

@Component({
  selector: 'app-manage-lessons-notes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    EditorModule,
    NotificationComponent,
    SpinnerOverlayComponent,
    TeacherBreadcrumbComponent
  ],
  templateUrl: './manage-lessons-notes.html',
  styleUrl: './manage-lessons-notes.css',
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0', overflow: 'hidden', opacity: '0' })),
      state('expanded', style({ height: '*', overflow: 'visible', opacity: '1' })),
      transition('collapsed <=> expanded', animate('300ms ease-in-out'))
    ])
  ]
})
export class ManageLessonsNotes implements OnInit {
  isFormOpen = false;
  subtopicId = '';
  subtopicName = 'Subtopic';
  topicId = '';
  gradeSubjectId = '';

  lessonName = '';
  videoUrl = '';
  duration: number | null = null;
  trailer = false;
  orderIndex = 1;
  points: number = 1;
  editorReady = true;
  noteContent: string = '';
  orderNumbers = Array.from({ length: 100 }, (_, i) => i + 1);
  editingLessonId: string | null = null;
  originalLesson: any = null;

  tinyMceConfig = {
    height: 300,
    menubar: false,
    plugins: [
      'anchor', 'autolink', 'charmap', 'codesample',
      'emoticons', 'image', 'link', 'lists', 'media',
      'searchreplace', 'table', 'visualblocks', 'wordcount'
    ],
    toolbar:
      'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | ' +
      'link image media table | align lineheight | numlist bullist indent outdent | ' +
      'emoticons charmap | removeformat'
  };

  existingLessons: any[] = [];
  isLoadingLessons = false;

  selectedLesson: any = null;
  isMarkingComplete = false;
  showCompleteModal = false;
  completedScore: number = 0;
  learnerId: string = '';

  private teacherService = inject(TeacherService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.subtopicId = params['subTopicId'];
      this.topicId = params['topicId'] || localGet('selectedTopicId') || '';
      this.gradeSubjectId = params['gradeSubjectId'] || localGet('selectedGradeSubjectId') || '';
      if (this.subtopicId) {
        this.loadSubtopicName();
        this.loadLessons();
        this.loadLearnerId();
      }
    });
  }

  loadLearnerId() {
    const userDetails = localGet('userDetails');
    if (userDetails) {
      try {
        const user = JSON.parse(userDetails);
        this.learnerId = user.id || '';
      } catch {
        this.learnerId = '';
      }
    }
    if (!this.learnerId) {
      this.teacherService.http.get<any>(`${environment.apiUrl}/user/me`).subscribe({
        next: (user) => { this.learnerId = user.id || ''; },
        error: (err: unknown) => console.error('Error loading learner ID:', err)
      });
    }
  }

  goBack() {
    if (this.topicId && this.gradeSubjectId) {
      this.router.navigate(['/courses/subtopics', this.gradeSubjectId, this.topicId]);
    } else {
      window.history.back();
    }
  }

  get isLessonFormChanged(): boolean {
    if (!this.editingLessonId || !this.originalLesson) return true;
    return this.lessonName !== this.originalLesson.name ||
           this.videoUrl !== this.originalLesson.videoUrl ||
           this.duration !== this.originalLesson.duration ||
           this.trailer !== this.originalLesson.trailer ||
           this.orderIndex !== this.originalLesson.orderIndex ||
           this.points !== this.originalLesson.points ||
           this.noteContent !== this.originalLesson.content;
  }

  toggleForm() {
    this.isFormOpen = !this.isFormOpen;
    if (this.isFormOpen && !this.editingLessonId) {
      this.noteContent = '';
    }
  }

  saveLesson() {
    if (!this.lessonName || !this.duration) {
      this.notificationService.showWarning('Please fill in all required fields.');
      return;
    }
    if (!this.subtopicId) {
      this.notificationService.showError('No subtopic ID found. Please navigate from a subtopic page.');
      return;
    }

    const lessonData = {
      name: this.lessonName,
      content: this.noteContent,
      videoUrl: this.videoUrl || null,
      active: true,
      subTopicId: this.subtopicId,
      orderIndex: this.orderIndex,
      duration: this.duration! * 60,
      trailer: this.trailer,
      points: this.points
    };

    if (this.editingLessonId) {
      this.teacherService.http.put(`${environment.apiUrl}/lesson/update`, { ...lessonData, id: this.editingLessonId }).subscribe({
        next: () => {
          this.notificationService.showSuccess('Lesson updated successfully!');
          this.loadLessons();
          this.resetForm();
        },
        error: (err: unknown) => {
          console.error('Error updating lesson:', err);
          this.notificationService.showError('Error updating lesson. Please try again.');
        }
      });
    } else {
      this.teacherService.http.post(`${environment.apiUrl}/lesson`, lessonData).subscribe({
        next: () => {
          this.notificationService.showSuccess('Lesson created successfully!');
          this.loadLessons();
          this.resetForm();
        },
        error: (err: unknown) => {
          console.error('Error creating lesson:', err);
          this.notificationService.showError('Error creating lesson. Please try again.');
        }
      });
    }
  }

  resetForm() {
    this.isFormOpen = false;
    this.editingLessonId = null;
    this.originalLesson = null;
    this.lessonName = '';
    this.videoUrl = '';
    this.duration = null;
    this.trailer = false;
    this.orderIndex = 1;
    this.points = 1;
    this.noteContent = '';
  }

  cancel() {
    this.resetForm();
  }

  onTrailerChange(event: Event) {
    this.trailer = (event.target as HTMLInputElement).checked;
  }

  editLesson(lesson: any) {
    this.editorReady = false;
    this.editingLessonId = lesson.id;
    this.lessonName = lesson.name;
    this.videoUrl = lesson.videoUrl || '';
    this.duration = lesson.rawDuration || null;
    this.trailer = lesson.trailer || false;
    this.orderIndex = lesson.orderIndex || 1;
    this.points = lesson.points ?? 1;
    this.noteContent = lesson.content || '';
    this.originalLesson = {
      name: lesson.name,
      videoUrl: lesson.videoUrl || '',
      duration: lesson.rawDuration || null,
      trailer: lesson.trailer || false,
      orderIndex: lesson.orderIndex || 1,
      points: lesson.points ?? 1,
      content: lesson.content || ''
    };
    this.isFormOpen = true;
    setTimeout(() => { this.editorReady = true; }, 50);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteLesson(lesson: any) {
    if (!confirm(`Delete "${lesson.name}"?`)) return;
    this.teacherService.http.delete(`${environment.apiUrl}/lesson/${lesson.id}`).subscribe({
      next: () => {
        this.existingLessons = this.existingLessons.filter(l => l.id !== lesson.id);
        this.notificationService.showSuccess('Lesson deleted successfully.');
      },
      error: (err: unknown) => {
        console.error('Error deleting lesson:', err);
        this.notificationService.showError('Error deleting lesson. Please try again.');
      }
    });
  }

  loadLessons() {
    this.isLoadingLessons = true;
    this.teacherService.http.get<any[]>(`${environment.apiUrl}/lesson/fetch/bySubTopicId/${this.subtopicId}`).subscribe({
      next: (lessons) => {
        this.existingLessons = lessons.map(lesson => {
          const content = lesson.content || '';
          return {
            id: lesson.id,
            name: lesson.name,
            rawDuration: Math.floor((lesson.duration || 0) / 60),
            duration: `${Math.floor((lesson.duration || 0) / 60)} minutes`,
            notesCount: content.trim() ? 1 : 0,
            videoUrl: lesson.videoUrl,
            trailer: lesson.trailer,
            orderIndex: lesson.orderIndex,
            points: lesson.points ?? 1,
            content,
            notes: content.trim() ? [{ text: content }] : []
          };
        });
        this.isLoadingLessons = false;
      },
      error: (err: unknown) => { console.error('Error loading lessons:', err); this.isLoadingLessons = false; }
    });
  }

  loadSubtopicName() {
    this.subtopicName = localGet('selectedSubTopicName') || localGet('selectedTopicName') || 'Subtopic';
  }

  openLesson(lesson: any) {
    this.selectedLesson = { ...lesson };
    this.showCompleteModal = false;
    this.completedScore = 0;
  }

  closeLesson() {
    this.selectedLesson = null;
    this.showCompleteModal = false;
    this.completedScore = 0;
  }

  getYoutubeThumbnail(url: string): string | null {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
  }
}
