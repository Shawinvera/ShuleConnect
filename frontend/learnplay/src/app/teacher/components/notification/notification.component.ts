import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="notification" 
         [class]="getNotificationClass()"
         class="fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg max-w-md animate-slide-in">
      <div class="flex items-center gap-3">
        <span class="text-2xl">{{ getIcon() }}</span>
        <p class="font-fredoka text-lg">{{ notification.message }}</p>
        <button (click)="close()" class="ml-auto text-xl font-bold hover:opacity-70">×</button>
      </div>
    </div>
  `,
  styles: [`
    .animate-slide-in {
      animation: slideIn 0.3s ease-out;
    }
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `]
})
export class NotificationComponent implements OnInit {
  notification: Notification | null = null;

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.notificationService.notification$.subscribe(
      notification => this.notification = notification
    );
  }

  getNotificationClass(): string {
    if (!this.notification) return '';
    const baseClass = 'border-l-4 ';
    switch (this.notification.type) {
      case 'success':
        return baseClass + 'bg-green-50 border-green-500 text-green-800';
      case 'error':
        return baseClass + 'bg-red-50 border-red-500 text-red-800';
      case 'warning':
        return baseClass + 'bg-yellow-50 border-yellow-500 text-yellow-800';
      default:
        return baseClass + 'bg-gray-50 border-gray-500 text-gray-800';
    }
  }

  getIcon(): string {
    if (!this.notification) return '';
    switch (this.notification.type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  }

  close() {
    this.notificationService.clear();
  }
}
