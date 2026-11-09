import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourseAnalyticsService, CourseAnalytics } from '../../../../services/course-analytics.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-course-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-analytics.html'
})
export class CourseAnalyticsComponent implements OnChanges {
  @Input() courseId!: string;

  isLoading = false;
  data: CourseAnalytics | null = null;

  constructor(private service: CourseAnalyticsService, public toast: ToastService) {}

  ngOnChanges() {
    if (!this.courseId) return;
    console.log('CourseAnalytics calling API with courseId:', this.courseId);
    this.isLoading = true;
    this.data = null;
    this.service.getCourseAnalytics(this.courseId).subscribe({
      next: (res) => { this.data = res; this.isLoading = false; },
      error: (err) => {
        console.error('Course analytics error status:', err.status);
        console.error('Course analytics error body:', JSON.stringify(err.error));
        console.error('Course analytics full error:', err);
        this.isLoading = false;
        this.toast.show('Failed to load course analytics.', 'error');
      }
    });
  }
}
