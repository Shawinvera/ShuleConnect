import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../shared/services/toast.service';
import { localGet } from '../../../shared/components/utils/local-storage.util';
import { CourseAnalyticsComponent } from './course-analytics/course-analytics';
import { TopicsAnalyticsComponent } from './topics-analytics/topics-analytics';
import { SubtopicsAnalyticsComponent } from './subtopics-analytics/subtopics-analytics';
import { LessonsAnalyticsComponent } from './lessons-analytics/lessons-analytics';

export type AnalyticsTab = 'course' | 'topics' | 'subtopics' | 'lessons';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    ToastNotificationComponent,
    CourseAnalyticsComponent,
    TopicsAnalyticsComponent,
    SubtopicsAnalyticsComponent,
    LessonsAnalyticsComponent
  ],
  templateUrl: './analytics.html',
  styleUrls: ['./analytics.css']
})
export class AnalyticsComponent implements OnInit {
  activeTab: AnalyticsTab = 'course';
  courseId = '';

  tabs: { key: AnalyticsTab; label: string }[] = [
    { key: 'course',    label: 'Course Analytics' },
    { key: 'topics',    label: 'Topics' },
    { key: 'subtopics', label: 'Subtopics' },
    { key: 'lessons',   label: 'Lessons' }
  ];

  constructor(private route: ActivatedRoute, public toast: ToastService) {}

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('courseId') ||
                   localGet('selectedCourseId') || '';
    console.log('Analytics courseId:', this.courseId);
    console.log('All localStorage keys:', Object.keys(localStorage));
    if (!this.courseId) {
      this.toast.show('No course selected. Please select a course first.', 'warning');
    }
  }

  setTab(tab: AnalyticsTab) {
    this.activeTab = tab;
  }
}
