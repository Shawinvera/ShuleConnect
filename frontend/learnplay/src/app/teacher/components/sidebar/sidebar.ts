import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { SidebarService } from '../../services/sidebar.service';
import { filter } from 'rxjs/operators';
import { localGet } from '../../../shared/components/utils/local-storage.util';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent implements OnInit {
  isExpanded = false;
  currentPage: 'courses' | 'dashboard' | 'other' = 'other';

  constructor(
    private router: Router,
    private authService: AuthService,
    private sidebarService: SidebarService
  ) {}

  ngOnInit() {
    this.isExpanded = this.sidebarService.getCurrentState();
    this.detectPage(this.router.url);
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.detectPage(e.urlAfterRedirects);
    });
  }

  detectPage(url: string) {
    if (url === '/courses' || url === '/courses/') {
      this.currentPage = 'courses';
    } else if (
      url.includes('/courses/dashboard') ||
      url.includes('/courses/grades') ||
      url.includes('/courses/subjects') ||
      url.includes('/courses/content') ||
      url.includes('/courses/grade') ||
      url.includes('/courses/topics') ||
      url.includes('/courses/subtopics') ||
      url.includes('/courses/lessons') ||
      url.includes('/courses/exams') ||
      url.includes('/courses/subscription_plan') ||
      url.includes('/courses/analytics')
    ) {
      this.currentPage = 'dashboard';
    } else {
      this.currentPage = 'other';
    }
  }

  toggle() {
    this.isExpanded = !this.isExpanded;
    this.sidebarService.setSidebarState(this.isExpanded);
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }

  navigateWithCourse(path: string) {
    const courseId = localGet('selectedCourseId');
    if (courseId) {
      this.router.navigate(['/courses', path, courseId]);
    } else {
      this.router.navigate(['/courses', path]);
    }
  }

  onLogout() {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/sign-up/sign-in']),
      error: () => this.router.navigate(['/sign-up/sign-in'])
    });
  }

  isActive(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }
}
