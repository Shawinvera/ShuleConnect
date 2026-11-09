import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container">
      <div 
        *ngFor="let notification of notifications" 
        class="notification"
        [ngClass]="'notification-' + notification.type"
      >
        <div class="notification-content">
          <span class="notification-icon">
            <ng-container [ngSwitch]="notification.type">
              <span *ngSwitchCase="'success'">✓</span>
              <span *ngSwitchCase="'error'">✗</span>
              <span *ngSwitchCase="'warning'">⚠</span>
              <span *ngSwitchDefault="'info'">ℹ</span>
            </ng-container>
          </span>
          <span class="notification-message">{{ notification.message }}</span>
          <button 
            class="notification-close" 
            (click)="removeNotification(notification.id)"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      max-width: 400px;
    }

    .notification {
      margin-bottom: 10px;
      padding: 12px 16px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      animation: slideIn 0.3s ease-out;
    }

    .notification-success {
      background-color: #d4edda;
      border-left: 4px solid #28a745;
      color: #155724;
    }

    .notification-error {
      background-color: #f8d7da;
      border-left: 4px solid #dc3545;
      color: #721c24;
    }

    .notification-warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      color: #856404;
    }

    .notification-info {
      background-color: #d1ecf1;
      border-left: 4px solid #17a2b8;
      color: #0c5460;
    }

    .notification-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .notification-icon {
      font-weight: bold;
      font-size: 16px;
    }

    .notification-message {
      flex: 1;
    }

    .notification-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
    }

    .notification-close:hover {
      opacity: 1;
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
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription: Subscription = new Subscription();

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.subscription = this.notificationService.getNotifications().subscribe(
      notifications => this.notifications = notifications
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  removeNotification(id: string) {
    this.notificationService.removeNotification(id);
  }
}