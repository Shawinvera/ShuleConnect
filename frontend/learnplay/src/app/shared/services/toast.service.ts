import { Injectable } from '@angular/core';
import { ToastType } from '../components/toast-notification/toast-notification';

@Injectable({ providedIn: 'root' })
export class ToastService {
  message = '';
  type: ToastType = 'error';
  visible = false;
  private timer: any;

  show(message: string, type: ToastType = 'error', duration = 4000) {
    clearTimeout(this.timer);
    this.message = message;
    this.type = type;
    this.visible = true;
    if (duration > 0) {
      this.timer = setTimeout(() => this.dismiss(), duration);
    }
  }

  dismiss() {
    this.visible = false;
    this.message = '';
  }
}
