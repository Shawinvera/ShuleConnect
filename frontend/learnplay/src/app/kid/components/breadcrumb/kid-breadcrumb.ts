import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Location } from '@angular/common';

interface Crumb {
  label: string;
  path: string;
}

@Component({
  selector: 'app-kid-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kid-breadcrumb.html',
  styleUrl: './kid-breadcrumb.css',
})
export class KidBreadcrumbComponent implements OnInit, OnDestroy {
  crumbs: Crumb[] = [];
  canGoBack = false;
  private sub!: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
  ) {}

  ngOnInit() {
    this.build();
    this.sub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.build());
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  build() {
    const url = this.router.url;
    const crumbs: Crumb[] = [{ label: 'Dashboard', path: '/kid' }];

    // Fetch all names from storage
    const subjectName = this.getFromStorage('currentSubjectName') || 'Subject';
    const topicName = this.getFromStorage('currentUnitName') || 'Topic'; // Unit 1: Indices
    const subTopicName = this.getFromStorage('currentSubTopicName') || 'Sub-Topic'; // Addition Indices
    const lessonPartName = this.getFromStorage('currentLessonPartName') || 'Part'; // Human Brand...

    const gsId = this.getFromStorage('currentGsId');

    // Identify segments
    const hasSubject = url.includes('/subject/');
    const hasTopic = url.includes('/unit/');
    const hasSubTopic = url.includes('/subtopic/');
    const hasLessonPart = url.includes('/lesson/');

    if (hasSubject && gsId) {
      const subjectSlug = url.split('/subject/')[1]?.split('/')[0] || '';
      const subjectPath = `/kid/subject/${subjectSlug}/${gsId}`;
      crumbs.push({ label: subjectName, path: subjectPath });

      if (hasTopic) {
        const unitId = url.split('/unit/')[1]?.split('/')[0] || '';
        const topicPath = `/kid/subject/${subjectSlug}/unit/${unitId}`;
        crumbs.push({ label: topicName, path: topicPath });

        if (hasSubTopic) {
          const subTopicId = url.split('/subtopic/')[1]?.split('/')[0] || '';
          const subTopicPath = `/kid/subject/${subjectSlug}/unit/${unitId}/subtopic/${subTopicId}`;
          crumbs.push({ label: subTopicName, path: subTopicPath });

          if (hasLessonPart) {
            // The final leaf: the actual video content
            crumbs.push({ label: lessonPartName, path: url });
          }
        }
      }
    }

    this.crumbs = crumbs;
    this.canGoBack = crumbs.length > 1;
  }

  getFromStorage(key: string): string {
    try {
      return localStorage.getItem(key) || '';
    } catch {
      return '';
    }
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
