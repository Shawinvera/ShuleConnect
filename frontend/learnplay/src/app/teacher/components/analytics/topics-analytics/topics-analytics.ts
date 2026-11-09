import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../../shared/services/toast.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-topics-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topics-analytics.html'
})
export class TopicsAnalyticsComponent implements OnChanges {
  @Input() courseId!: string;

  isLoading = false;
  data: any[] = [];

  constructor(private http: HttpClient, public toast: ToastService) {}

  ngOnChanges() {
    if (!this.courseId) return;
    this.isLoading = true;
    this.data = [];
    this.http.get<any[]>(`${environment.apiUrl}/analytics/topics/${this.courseId}`).subscribe({
      next: (res) => { this.data = res; this.isLoading = false; },
      error: (err) => {
        console.error('Topics analytics error:', err);
        this.isLoading = false;
        this.toast.show('Failed to load topics analytics.', 'error');
      }
    });
  }
}
