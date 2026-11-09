import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  message: string;
  type: 'success' | 'error' | 'warning';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new BehaviorSubject<Notification | null>(null);
  notification$ = this.notificationSubject.asObservable();

  showSuccess(message: string) {
    this.notificationSubject.next({ message, type: 'success' });
    this.autoClear();
  }

  showError(message: string) {
    this.notificationSubject.next({ message, type: 'error' });
    this.autoClear();
  }

  showWarning(message: string) {
    this.notificationSubject.next({ message, type: 'warning' });
    this.autoClear();
  }

  clear() {
    this.notificationSubject.next(null);
  }

  private autoClear() {
    setTimeout(() => this.clear(), 5000);
  }
}
