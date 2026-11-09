import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ToastType = 'error' | 'warning' | 'success' | 'info';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-notification.html',
})
export class ToastNotificationComponent {
  @Input() message = '';
  @Input() type: ToastType = 'error';
  @Input() visible = false;
  @Output() dismissed = new EventEmitter<void>();

  get icon(): string {
    return { error: '✕', warning: '⚠', success: '✓', info: 'ℹ' }[this.type];
  }

  get styles(): { bg: string; border: string; icon: string; text: string } {
    return {
      error:   { bg: 'bg-red-50',     border: 'border-red-300',    icon: 'bg-red-500',    text: 'text-red-700'    },
      warning: { bg: 'bg-orange-50',  border: 'border-orange-300', icon: 'bg-orange-500', text: 'text-orange-700' },
      success: { bg: 'bg-green-50',   border: 'border-green-300',  icon: 'bg-green-500',  text: 'text-green-700'  },
      info:    { bg: 'bg-purple-50',  border: 'border-purple-300', icon: 'bg-purple-500', text: 'text-purple-700' },
    }[this.type];
  }

  dismiss() {
    this.dismissed.emit();
  }
}
