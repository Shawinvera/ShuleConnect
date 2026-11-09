import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../services/auth.service';
import { SidebarService } from '../../../services/sidebar.service';
import { CameraStateService } from '../../../../shared/services/camera-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
})
export class Navbar implements OnInit, OnDestroy {
  navOpen = false;
  avatarDropdownOpen = false;
  sidebarExpanded = false;
  isCameraOpen = false;
  userName = 'Admin'; // Default name, can be updated from user service
  private sidebarSubscription: Subscription = new Subscription();
  private cameraSub?: Subscription;

  constructor(
    private router: Router,
    private location: Location,
    private authService: AuthService,
    private sidebarService: SidebarService,
    private cameraStateService: CameraStateService
  ) {}

  ngOnInit() {
    // Subscribe to sidebar state changes
    this.sidebarSubscription = this.sidebarService.getSidebarState().subscribe(
      (expanded: boolean) => this.sidebarExpanded = expanded
    );

    // Subscribe to camera state to hide bottom navigation when camera is open
    this.cameraSub = this.cameraStateService.cameraOpen$.subscribe((isOpen) => {
      this.isCameraOpen = isOpen;
    });
  }

  ngOnDestroy() {
    this.sidebarSubscription.unsubscribe();
    this.cameraSub?.unsubscribe();
  }

  get isHomePage(): boolean {
    return this.router.url === '/courses' || this.router.url === '/courses/';
  }

  get isGradesPage(): boolean {
    return this.router.url.startsWith('/courses/grades');
  }

  get isExamsPage(): boolean {
    return this.router.url.startsWith('/courses/exams');
  }

  get hasCourseSelected(): boolean {
    return !this.isHomePage;
  }

  toggleNav() { 
    this.navOpen = !this.navOpen; 
    // Close avatar dropdown when opening nav
    if (this.navOpen) {
      this.avatarDropdownOpen = false;
    }
  }

  toggleAvatarDropdown() {
    this.avatarDropdownOpen = !this.avatarDropdownOpen;
    // Close nav when opening avatar dropdown
    if (this.avatarDropdownOpen) {
      this.navOpen = false;
    }
  }

  closeDropdowns() {
    this.avatarDropdownOpen = false;
    this.navOpen = false;
  }

  goBack() { this.location.back(); }

  goToCourses() {
    this.router.navigate(['/courses']);
  }

  goToDashboard() {
    const courseId = localStorage.getItem('selectedCourseId');
    if (courseId) {
      this.router.navigate(['/courses/dashboard', courseId]);
    } else {
      this.router.navigate(['/courses']);
    }
  }

  onHomeClick() {
    this.router.navigate(['/courses']);
  }

  onGradesClick() {
    if (!this.hasCourseSelected) return;
    this.router.navigate(['/courses/grades']);
  }

  onExamsClick() {
    if (!this.hasCourseSelected) return;
    this.router.navigate(['/courses/exams']);
  }

  onAvatarClick() {
    this.router.navigate(['/courses']);
  }
  
  onLogout() {
    this.closeDropdowns();
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate([`/sign-up/sign-in`]);
      },
      error: () => {
        this.router.navigate([`/sign-up/sign-in`]);
      }
    });
  }
}
