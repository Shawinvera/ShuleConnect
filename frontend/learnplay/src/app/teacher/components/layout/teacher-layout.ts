import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../dashboard/navbar/navbar';
import { SidebarComponent } from '../sidebar/sidebar';
import { SidebarService } from '../../services/sidebar.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-teacher-layout',
  standalone: true,
  imports: [RouterOutlet, Navbar, SidebarComponent, CommonModule],
  template: `
    <app-sidebar></app-sidebar>
    <div class="main-content-wrapper" [class.sidebar-expanded]="sidebarExpanded">
      <app-navbar></app-navbar>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .main-content-wrapper {
      transition: margin-left 0.3s ease;
      min-height: 100vh;
    }
    
    @media (min-width: 768px) {
      .main-content-wrapper {
        margin-left: 68px; /* Default collapsed sidebar width */
      }
      
      .main-content-wrapper.sidebar-expanded {
        margin-left: 220px; /* Expanded sidebar width */
      }
    }
    
    @media (max-width: 767px) {
      .main-content-wrapper {
        margin-left: 0; /* No sidebar on mobile */
      }
    }
    
    .main-content {
      padding-top: 80px; /* Mobile navbar height only */
      min-height: calc(100vh - 80px);
    }
    
    @media (min-width: 768px) {
      .main-content {
        padding-top: 103px; /* Desktop navbar height only */
        min-height: calc(100vh - 103px);
      }
    }
  `]
})
export class TeacherLayout implements OnInit, OnDestroy {
  sidebarExpanded = false;
  private sidebarSubscription: Subscription = new Subscription();

  constructor(private sidebarService: SidebarService) {}

  ngOnInit() {
    // Subscribe to sidebar state changes
    this.sidebarSubscription = this.sidebarService.getSidebarState().subscribe(
      (expanded: boolean) => this.sidebarExpanded = expanded
    );
  }

  ngOnDestroy() {
    this.sidebarSubscription.unsubscribe();
  }
}
