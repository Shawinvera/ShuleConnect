import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TeacherService } from '../../../../services/teacher.service';
import { HttpClientModule } from '@angular/common/http';
import { localGet, localSet } from '../../../../../shared/components/utils/local-storage.util';
import { SpinnerOverlayComponent } from '../../../../../shared/components/spinner-overlay/spinner-overlay';
import { TeacherBreadcrumbComponent } from '../../../breadcrumb/teacher-breadcrumb';
import { ToastNotificationComponent } from '../../../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../../../shared/services/toast.service';

interface Topic {
  id: string;
  name: string;
  description: string;
  subtopicsCount: number;
  orderIndex?: number;
}

@Component({
  selector: 'app-topics',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, SpinnerOverlayComponent, TeacherBreadcrumbComponent, ToastNotificationComponent],
  templateUrl: './topics.html'
})
export class TopicsComponent implements OnInit {
  private router = inject(Router);
  private teacherService = inject(TeacherService);
  private route = inject(ActivatedRoute);
  public toast = inject(ToastService);

  isFormVisible = false;
  editingTopic: Topic | null = null;
  originalTopic: { name: string; description: string; orderIndex: number } | null = null;
  subjectName = 'Subject';
  subjectDescription = '';
  gradeSubjectId = '';
  topics: Topic[] = [];
  isLoading = false;

  newTopic = { name: '', description: '', orderIndex: 1 };
  orderNumbers = Array.from({length: 100}, (_, i) => i + 1);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const fromRoute = params['gradeSubjectId'];
      const fromStorage = localGet('selectedGradeSubjectId');
      const candidateId = fromRoute || fromStorage || '';

      if (candidateId) {
        this.gradeSubjectId = candidateId;
        localSet('selectedGradeSubjectId', candidateId);
        this.loadSubjectDetails();
        this.loadTopics();
      }
    });
  }

  loadSubjectDetails() {
    this.subjectName = localGet('selectedSubjectName') || 'Subject';
  }

  loadTopics() {
    this.isLoading = true;
    this.teacherService.getTopicsByGradeSubject(this.gradeSubjectId).subscribe({
      next: (topics: any[]) => {
        this.topics = topics.map(t => ({
          id: t.id || t.topicId,
          name: t.name,
          description: t.description || 'No description',
          subtopicsCount: 0,
          orderIndex: t.orderIndex ?? null
        })).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        this.isLoading = false;
        this.topics.forEach((topic, index) => {
          this.teacherService.getSubTopicsByTopic(topic.id).subscribe({
            next: (subtopics: any[]) => { this.topics[index].subtopicsCount = subtopics.length; },
            error: () => { this.topics[index].subtopicsCount = 0; }
          });
        });
      },
      error: (err: unknown) => {
        console.error('Error loading topics:', err);
        this.isLoading = false;
        this.toast.show('Couldn\'t load topics. Please try again.', 'error');
      }
    });
  }

  toggleForm() {
    this.isFormVisible = !this.isFormVisible;
    if (!this.isFormVisible) this.resetForm();
  }

  resetForm() {
    this.newTopic = { name: '', description: '', orderIndex: 1 };
    this.editingTopic = null;
    this.originalTopic = null;
  }

  get isTopicFormChanged(): boolean {
    if (!this.editingTopic || !this.originalTopic) return true;
    return this.newTopic.name !== this.originalTopic.name ||
           this.newTopic.description !== this.originalTopic.description ||
           Number(this.newTopic.orderIndex) !== this.originalTopic.orderIndex;
  }

  saveTopic() {
    if (!this.newTopic.name) return;

    if (this.editingTopic) {
      const updatePayload = {
        name: this.newTopic.name,
        description: this.newTopic.description || 'No description provided',
        active: true,
        gradeSubjectId: this.gradeSubjectId,
        orderIndex: Number(this.newTopic.orderIndex)
      };

      this.teacherService.updateTopic(this.editingTopic.id, updatePayload).subscribe({
        next: () => {
          const index = this.topics.findIndex(t => t.id === this.editingTopic!.id);
          if (index !== -1) { this.topics[index] = { ...this.topics[index], ...updatePayload }; this.topics = [...this.topics]; }
          this.isFormVisible = false;
          this.resetForm();
          this.toast.show('Topic updated successfully!', 'success');
        },
        error: (err: unknown) => {
          console.error('Error updating topic:', err);
          this.toast.show('Couldn\'t update topic. Please try again.', 'error');
        }
      });

    } else {
      const actualGradeSubjectId = this.gradeSubjectId || localGet('selectedGradeSubjectId');

      if (!actualGradeSubjectId || !actualGradeSubjectId.startsWith('gradesubject-')) {
        this.toast.show('Invalid grade-subject ID. Please go back and select a subject again.', 'error');
        return;
      }

      const topicPayload = {
        name: this.newTopic.name,
        description: this.newTopic.description || 'No description provided',
        active: true,
        gradeSubjectId: actualGradeSubjectId,
        orderIndex: Number(this.newTopic.orderIndex)
      };

      this.teacherService.createTopic(topicPayload).subscribe({
        next: (topicResponse: any) => {
          const topicId = topicResponse.generatedId || topicResponse.id;
          localSet('selectedTopicId', topicId);
          const newTopic: Topic = { id: topicId, name: topicPayload.name, description: topicPayload.description, subtopicsCount: 0, orderIndex: topicPayload.orderIndex };
          this.topics = [newTopic, ...this.topics];
          this.isFormVisible = false;
          this.resetForm();
          this.toast.show('Topic created successfully!', 'success');
        },
        error: (err: unknown) => {
          console.error('Error creating topic:', err);
          this.toast.show('Couldn\'t create topic. Please try again.', 'error');
        }
      });
    }
  }

  editTopic(topic: Topic) {
    this.editingTopic = topic;
    this.newTopic = { name: topic.name, description: topic.description, orderIndex: topic.orderIndex || 1 };
    this.originalTopic = { name: topic.name, description: topic.description, orderIndex: topic.orderIndex || 1 };
    this.isFormVisible = true;
  }

  deleteTopic(id: string) {
    if (confirm('Are you sure you want to delete this topic?')) {
      this.teacherService.deleteTopic(id).subscribe({
      next: () => {
        this.topics = this.topics.filter(t => t.id !== id);
        this.toast.show('Topic deleted successfully.', 'success');
      },
      error: (err: unknown) => {
        console.error('Error deleting topic:', err);
        this.toast.show('Couldn\'t delete topic. Please try again.', 'error');
      }
    });
    }
  }

  navigateToSubtopic(topic: Topic) {
    localSet('selectedTopicId', topic.id);
    localSet('selectedTopicName', topic.name);
    this.router.navigate(['/courses/subtopics', this.gradeSubjectId, topic.id]);
  }

  goBackToGrade1() {
    const gradeId = localGet('selectedGradeId') || '';
    this.router.navigate(['/courses/grade', gradeId]);
  }
}
