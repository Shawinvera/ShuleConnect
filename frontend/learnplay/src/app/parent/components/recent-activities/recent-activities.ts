import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { ParentApiService, LessonTrackerDto } from '../../services/parent-api.service';
import { Location } from '@angular/common';
import { LearnerService } from '../../../kid/services/learner/learner';
import { ParentNavbar } from '../parent-navbar/parent-navbar';
import { Navbar } from '../../../kid/reusable/navbar/navbar';

@Component({
  selector: 'app-recent-activities',
  standalone: true,
  imports: [CommonModule, MatIconModule, SpinnerOverlayComponent, ParentNavbar, Navbar],
  templateUrl: './recent-activities.html',
})
export class RecentActivities implements OnInit {
  activities: { title: string; description: string; points: number; date: string }[] = [];
  isLoading = false;
  childName = '';
  childId = '';
  referrer = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private parentApiService: ParentApiService,
    private location: Location,
    private learnerService: LearnerService
  ) {}

  ngOnInit() {
    this.referrer = this.route.snapshot.queryParams['from'] || 'parent';
    const storedChild = localStorage.getItem('selectedChild');
    if (storedChild) {
      const child = JSON.parse(storedChild);
      this.childName = child.name || '';
      this.childId = child.id || '';
      if (child.id) this.loadActivities(child.id);
    }
  }

  get isFromKid(): boolean {
    return this.referrer === 'kid';
  }

  loadActivities(learnerId: string) {
    this.isLoading = true;
    this.parentApiService.getLearnerHistory(learnerId).subscribe({
      next: (history: LessonTrackerDto[]) => {
        this.activities = history.map(item => ({
          title: `Completed ${item.lessonName}`,
          description: `${item.subjectName} lesson completed`,
          points: item.points ?? 10,
          date: item.completedAt,
        }));
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  goBack() {
    if (this.referrer === 'kid') {
      this.router.navigate(['/kid']);
    } else {
      const childId = this.childId || JSON.parse(localStorage.getItem('selectedChild') || '{}').id;
      if (childId) {
        this.router.navigate(['/parent/child', childId]);
      } else {
        this.router.navigate(['/parent']);
      }
    }
  }

  goToDashboard() {
    if (this.referrer === 'kid') {
      this.router.navigate(['/kid']);
    } else {
      this.router.navigate(['/parent']);
    }
  }

  goToChildDetails() {
    if (this.childId) {
      this.router.navigate(['/parent/child', this.childId]);
    } else {
      this.router.navigate(['/parent']);
    }
  }

  goToLearnerDashboard() {
    if (!this.childId) return;
    const storedLearners: any[] = JSON.parse(localStorage.getItem('learners') || '[]');
    const fullLearner = storedLearners.find((l: any) => l.id === this.childId);
    if (fullLearner) {
      this.learnerService.updateSelectedLearner(fullLearner);
    }
    this.router.navigate(['/kid']);
  }
}
