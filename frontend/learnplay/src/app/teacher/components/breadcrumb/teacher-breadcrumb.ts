import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { localGet } from '../../../shared/components/utils/local-storage.util';

interface Crumb { label: string; path: string; }

@Component({
  selector: 'app-teacher-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teacher-breadcrumb.html',
  styleUrl: './teacher-breadcrumb.css'
})
export class TeacherBreadcrumbComponent implements OnInit, OnDestroy {
  crumbs: Crumb[] = [];
  canGoBack = false;
  private sub!: Subscription;

  constructor(private router: Router, private location: Location) {}

  ngOnInit() {
    this.build();
    this.sub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.build());
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  build() {
    const url = this.router.url;
    const courseId = localGet('selectedCourseId') || '';
    const crumbs: Crumb[] = [{ label: 'Courses', path: '/courses' }];

    if (url.includes('/courses/dashboard')) {
      crumbs.push({ label: 'Dashboard', path: `/courses/dashboard/${courseId}` });
    } else if (url.includes('/courses/grades')) {
      crumbs.push({ label: 'Dashboard', path: `/courses/dashboard/${courseId}` });
      crumbs.push({ label: 'Manage Grades', path: url });
    } else if (url.includes('/courses/subjects')) {
      crumbs.push({ label: 'Dashboard', path: `/courses/dashboard/${courseId}` });
      crumbs.push({ label: 'Manage Subjects', path: url });
    } else if (url.includes('/courses/content')) {
      crumbs.push({ label: 'Dashboard', path: `/courses/dashboard/${courseId}` });
      crumbs.push({ label: 'Grade Structure', path: url });
    } else if (url.includes('/courses/grade')) {
      const gradeName = localGet('selectedGradeName') || 'Grade Detail';
      crumbs.push({ label: 'Dashboard', path: `/courses/dashboard/${courseId}` });
      crumbs.push({ label: 'Grade Structure', path: `/courses/content/${courseId}` });
      crumbs.push({ label: gradeName, path: url });
    } else if (url.includes('/courses/topics')) {
      const subjectName = localGet('selectedSubjectName') || 'Topics';
      const gradeId = localGet('selectedGradeId') || '';
      crumbs.push({ label: 'Dashboard', path: `/courses/dashboard/${courseId}` });
      crumbs.push({ label: 'Grade Structure', path: `/courses/content/${courseId}` });
      crumbs.push({ label: 'Grade Detail', path: `/courses/grade/${gradeId}` });
      crumbs.push({ label: subjectName, path: url });
    } else if (url.includes('/courses/subtopics')) {
      const topicName = localGet('selectedTopicName') || 'Subtopics';
      const gradeId = localGet('selectedGradeId') || '';
      const gsId = localGet('selectedGradeSubjectId') || '';
      crumbs.push({ label: 'Dashboard', path: `/courses/dashboard/${courseId}` });
      crumbs.push({ label: 'Grade Structure', path: `/courses/content/${courseId}` });
      crumbs.push({ label: 'Grade Detail', path: `/courses/grade/${gradeId}` });
      crumbs.push({ label: 'Topics', path: `/courses/topics/${gsId}` });
      crumbs.push({ label: topicName, path: url });
    } else if (url.includes('/courses/lessons')) {
      const topicName = localGet('selectedTopicName') || 'Topic';
      const gradeId = localGet('selectedGradeId') || '';
      const gsId = localGet('selectedGradeSubjectId') || '';
      const topicId = localGet('selectedTopicId') || '';
      crumbs.push({ label: 'Dashboard', path: `/courses/dashboard/${courseId}` });
      crumbs.push({ label: 'Grade Structure', path: `/courses/content/${courseId}` });
      crumbs.push({ label: 'Grade Detail', path: `/courses/grade/${gradeId}` });
      crumbs.push({ label: 'Topics', path: `/courses/topics/${gsId}` });
      crumbs.push({ label: topicName, path: `/courses/subtopics/${gsId}/${topicId}` });
      crumbs.push({ label: 'Lessons', path: url });
    } else if (url.includes('/courses/subscription_plan')) {
      crumbs.push({ label: 'Dashboard', path: `/courses/dashboard/${courseId}` });
      crumbs.push({ label: 'Subscription Plan', path: url });
    } else if (url.includes('/courses/exams')) {
      crumbs.push({ label: 'Dashboard', path: `/courses/dashboard/${courseId}` });
      crumbs.push({ label: 'Manage Exams', path: url });
    }

    this.crumbs = crumbs;
    this.canGoBack = crumbs.length > 1;
  }

  navigate(crumb: Crumb, index: number) {
    if (index < this.crumbs.length - 1) {
      this.router.navigate([crumb.path]);
    }
  }

  goBack() {
    this.location.back();
  }
}
