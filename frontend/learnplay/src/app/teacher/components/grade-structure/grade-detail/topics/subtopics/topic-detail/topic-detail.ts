import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { TeacherService } from '../../../../../../../teacher/services/teacher.service';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { NotificationService } from '../../../../../../../services/notification.service';
import { NotificationComponent } from '../../../../../../../shared/components/notification/notification.component';
import { localGet, localSet } from '../../../../../../../shared/components/utils/local-storage.util';
import { ToastNotificationComponent } from '../../../../../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../../../../../shared/services/toast.service';
import { TeacherBreadcrumbComponent } from '../../../../../../../teacher/components/breadcrumb/teacher-breadcrumb';

interface Subtopic {
  id: number;
  name: string;
  description: string;
  videoCount: number;
  noteCount: number;
  
  orderIndex?: number;
}

@Component({
  selector: 'app-topic-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, NotificationComponent, ToastNotificationComponent, TeacherBreadcrumbComponent],
  templateUrl: './topic-detail.html'
})
export class TopicDetailComponent implements OnInit {
  private router = inject(Router);
  private teacherService = inject(TeacherService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  public toast = inject(ToastService);

  isFormVisible = false;
  editingSubtopic: Subtopic | null = null;
  originalSubtopic: { name: string; description: string; orderIndex: number } | null = null;
  topicName = 'Topic';
  topicId = '';
  gradeSubjectId = '';
  subtopics: Subtopic[] = [];

  newSubtopic = {
    name: '',
    description: '',
    orderIndex: 1
  };

  orderNumbers = Array.from({length: 100}, (_, i) => i + 1);

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.gradeSubjectId = params['gradeSubjectId'];
      // ✅ Use localGet
      this.topicId = params['topicId'] || localGet('selectedTopicId') || '';

      console.log('Topic Detail - gradeSubjectId:', this.gradeSubjectId);
      console.log('Topic Detail - topicId:', this.topicId);

      if (this.topicId) {
        // ✅ Use localSet
        localSet('selectedTopicId', this.topicId);
        this.loadTopicDetails();
        this.loadSubTopics();
      } else {
        console.error('No topicId found!');
      }
    });
  }

  loadTopicDetails() {
    // ✅ Use localGet
    this.topicName = localGet('selectedTopicName') || 'Topic';
  }

  loadSubTopics() {
    console.log('Loading subtopics for topicId:', this.topicId);
    this.teacherService.getSubTopicsByTopic(this.topicId).subscribe({
      next: (subtopics) => {
        console.log('Raw subtopics from API:', subtopics);
        this.subtopics = subtopics.map(s => {
          console.log('Subtopic data:', s);
          console.log('OrderIndex value:', s.orderIndex);
          return {
            id: s.id,
            name: s.name,
            description: s.description || 'No description',
            videoCount: 0,
            noteCount: s.lessonCount || 0,
            orderIndex: s.orderIndex ?? s.order_index ?? s.order ?? null
          };
        }).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        console.log('Mapped subtopics:', this.subtopics);
        this.subtopics.forEach(subtopic => this.loadVideoCount(subtopic));
      },
      error: (err: unknown) => {
        console.error('Error loading subtopics:', err);
        this.toast.show('Couldn\'t load subtopics. Please try again.', 'error');
      }
    });
  }

  loadVideoCount(subtopic: Subtopic) {
    this.teacherService.getLessonsBySubTopic(subtopic.id.toString()).subscribe({
      next: (lessons) => {
        subtopic.videoCount = lessons.filter(l => l.videoUrl && l.videoUrl !== null).length;
        subtopic.noteCount = lessons.length;
      },
      error: () => {
        subtopic.videoCount = 0;
      }
    });
  }

  toggleForm() {
    this.isFormVisible = !this.isFormVisible;
    if (!this.isFormVisible) {
      this.resetForm();
    }
  }

  resetForm() {
    this.newSubtopic = { name: '', description: '', orderIndex: 1 };
    this.editingSubtopic = null;
    this.originalSubtopic = null;
  }

  get isSubtopicFormChanged(): boolean {
    if (!this.editingSubtopic || !this.originalSubtopic) return true;
    return this.newSubtopic.name !== this.originalSubtopic.name ||
           this.newSubtopic.description !== this.originalSubtopic.description ||
           Number(this.newSubtopic.orderIndex) !== this.originalSubtopic.orderIndex;
  }

  editSubtopic(subtopic: Subtopic) {
    this.editingSubtopic = subtopic;
    this.newSubtopic = { name: subtopic.name, description: subtopic.description, orderIndex: subtopic.orderIndex || 1 };
    this.originalSubtopic = { name: subtopic.name, description: subtopic.description, orderIndex: subtopic.orderIndex || 1 };
    this.isFormVisible = true;
  }

  deleteSubtopic(id: number) {
    if (confirm('Are you sure you want to delete this subtopic?')) {
      this.teacherService.deleteSubTopic(id.toString()).subscribe({
        next: () => {
          this.subtopics = this.subtopics.filter(s => s.id !== id);
          this.toast.show('Subtopic deleted successfully.', 'success');
        },
        error: () => this.toast.show('Couldn\'t delete subtopic. Please try again.', 'error')
      });
    }
  }

  saveSubtopic() {
    if (this.newSubtopic.name) {
      if (!this.topicId) {
        this.notificationService.showError('Topic ID not found. Please refresh the page.');
        return;
      }

      if (this.editingSubtopic) {
        const updateData = {
          name: this.newSubtopic.name,
          description: this.newSubtopic.description || 'No description provided',
          active: true,
          topicId: this.topicId,
          orderIndex: Number(this.newSubtopic.orderIndex)
        };
        this.teacherService.updateSubTopic(this.editingSubtopic.id.toString(), updateData).subscribe({
          next: (response) => {
            if (response && response.successful === false) {
              this.toast.show(response.errorMessage || 'Couldn\'t update subtopic.', 'error');
              return;
            }
            this.isFormVisible = false;
            this.resetForm();
            this.loadSubTopics();
            this.toast.show('Subtopic updated successfully!', 'success');
          },
          error: () => this.toast.show('Couldn\'t update subtopic. Please try again.', 'error')
        });
        return;
      }

      const subTopicData = {
        name: this.newSubtopic.name,
        description: this.newSubtopic.description || 'No description provided',
        active: true,
        topicId: this.topicId,
        orderIndex: Number(this.newSubtopic.orderIndex)
      };

      this.teacherService.createSubTopic(subTopicData).subscribe({
        next: () => {
          this.notificationService.showSuccess('Subtopic created successfully!');
          this.toggleForm();
          this.loadSubTopics();
        },
        error: () => {
          this.notificationService.showError('Error creating subtopic. Please try again.');
        }
      });
    } else {
      this.notificationService.showWarning('Please enter a subtopic name.');
    }
  }

  navigateToSubTopic(subTopicId: number) {
    const subtopic = this.subtopics.find(s => s.id === subTopicId);
    if (subtopic) localSet('selectedSubTopicName', subtopic.name);
    this.router.navigate(['/courses/lessons', subTopicId]);
  }

  goBackToMathematics() {
    this.router.navigate(['/courses/topics', this.gradeSubjectId]);
  }
}