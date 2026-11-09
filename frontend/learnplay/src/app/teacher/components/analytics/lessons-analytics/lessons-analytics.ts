import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../../shared/services/toast.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-lessons-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lessons-analytics.html'
})
export class LessonsAnalyticsComponent implements OnChanges {
  @Input() courseId!: string;

  isLoading = false;
  data: any[] = [];

  constructor(private http: HttpClient, public toast: ToastService) {}

  ngOnChanges() {
    if (!this.courseId) return;
    this.isLoading = true;
    this.data = [];
    this.http.get<any[]>(`${environment.apiUrl}/analytics/lessons/${this.courseId}`).subscribe({
      next: (res) => { this.data = res; this.isLoading = false; },
      error: (err) => {
        console.error('Lessons analytics error:', err);
        this.isLoading = false;
        this.toast.show('Failed to load lessons analytics.', 'error');
      }
    });
  }
}
