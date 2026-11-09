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
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.css'
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  crumbs: Crumb[] = [];
  canGoBack = false;
  private sub!: Subscription;

  constructor(private router: Router, private route: ActivatedRoute, private location: Location) {}

  ngOnInit() {
    this.buildCrumbs();
    this.sub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.buildCrumbs());
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  buildCrumbs() {
    const url = this.router.url;
    const crumbs: Crumb[] = [{ label: 'Dashboard', path: '/parent' }];

    if (url.includes('/parent/add-child')) {
      crumbs.push({ label: 'Add Learner', path: '/parent/add-child' });
    } else if (url.includes('/parent/edit-learner-profile')) {
      const childName = this.getChildName();
      crumbs.push({ label: childName, path: this.getChildDetailsPath() });
      crumbs.push({ label: 'Edit Learner Profile', path: '/parent/edit-learner-profile' });
    } else if (url.includes('/parent/recent-activities')) {
      const childName = this.getChildName();
      crumbs.push({ label: childName, path: this.getChildDetailsPath() });
      crumbs.push({ label: 'Recent Activities', path: '/parent/recent-activities' });
    } else if (url.includes('/parent/child/')) {
      const childName = this.getChildName();
      crumbs.push({ label: childName, path: url });
    } else if (url.includes('/parent/select-learner')) {
      crumbs.push({ label: 'Select Learner', path: '/parent/select-learner' });
    }

    this.crumbs = crumbs;
    this.canGoBack = crumbs.length > 1;
  }

  getChildName(): string {
    try {
      const stored = localStorage.getItem('selectedChild');
      if (stored) {
        const child = JSON.parse(stored);
        return child.name || 'Child Details';
      }
    } catch {}
    return 'Child Details';
  }

  getChildDetailsPath(): string {
    try {
      const stored = localStorage.getItem('selectedChild');
      if (stored) {
        const child = JSON.parse(stored);
        return `/parent/child/${child.id}`;
      }
    } catch {}
    return '/parent';
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
