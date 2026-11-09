import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  
  getNotifications() {
    return this.notifications$.asObservable();
  }

  private addNotification(type: Notification['type'], message: string) {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date()
    };
    
    const current = this.notifications$.value;
    this.notifications$.next([...current, notification]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, 5000);
  }

  showSuccess(message: string) {
    this.addNotification('success', message);
  }

  showError(message: string) {
    this.addNotification('error', message);
  }

  showWarning(message: string) {
    this.addNotification('warning', message);
  }

  showInfo(message: string) {
    this.addNotification('info', message);
  }

  removeNotification(id: string) {
    const current = this.notifications$.value;
    this.notifications$.next(current.filter(n => n.id !== id));
  }

  clearAll() {
    this.notifications$.next([]);
  }
}