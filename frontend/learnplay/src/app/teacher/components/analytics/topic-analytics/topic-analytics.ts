import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../../shared/services/toast.service';
import { ToastNotificationComponent } from '../../../../shared/components/toast-notification/toast-notification';
import { TeacherBreadcrumbComponent } from '../../breadcrumb/teacher-breadcrumb';
import { SpinnerOverlayComponent } from '../../../../shared/components/spinner-overlay/spinner-overlay';
import { environment } from '../../../../../environments/environment';
import { localGet } from '../../../../shared/components/utils/local-storage.util';

interface TopicAccessStat {
  topicId: string;
  topicName: string;
  accessCount: number;
  accessPercentage: number;
}

interface TopicAnalyticsDto {
  gradeSubjectId: string;
  totalTopics: number;
  topicStats: TopicAccessStat[];
}

@Component({
  selector: 'app-topic-analytics',
  standalone: true,
  imports: [CommonModule, ToastNotificationComponent, TeacherBreadcrumbComponent, SpinnerOverlayComponent],
  templateUrl: './topic-analytics.html'
})
export class TopicAnalyticsComponent implements OnInit {
  isLoading = false;
  analytics: TopicAnalyticsDto | null = null;
  gradeSubjectId = '';
  subjectName = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    public toast: ToastService
  ) {}

  ngOnInit() {
    this.gradeSubjectId = this.route.snapshot.paramMap.get('gradeSubjectId') ||
                          localGet('selectedGradeSubjectId') || '';
    this.subjectName = localGet('selectedSubjectName') || 'Subject';

    if (!this.gradeSubjectId) {
      this.toast.show('No subject selected. Please go back and select a subject.', 'warning');
      return;
    }
    this.load();
  }

  load() {
    this.isLoading = true;
    this.analytics = null;
    this.http.get<TopicAnalyticsDto>(`${environment.apiUrl}/topic/analytics/${this.gradeSubjectId}`).subscribe({
      next: (res) => { this.analytics = res; this.isLoading = false; },
      error: (err) => {
        console.error('Topic analytics error:', err);
        this.isLoading = false;
        this.toast.show('Failed to load topic analytics.', 'error');
      }
    });
  }
}
