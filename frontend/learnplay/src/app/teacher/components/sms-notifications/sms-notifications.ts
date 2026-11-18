import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface SentLog {
  time: string;
  recipients: string;
  message: string;
  status: 'Sent ✅' | 'Failed ❌';
}

@Component({
  selector: 'app-sms-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './sms-notifications.html',
  styleUrl: './sms-notifications.css'
})
export class SmsNotificationsComponent {
  apiUrl = environment.apiUrl;

  recipientType = 'teachers';
  individualPhone = '';
  subject = '';
  message = '';
  isSending = false;
  successMessage = '';
  errorMessage = '';
  charCount = 0;
  logs: SentLog[] = [];

  onMessageChange() {
    this.charCount = this.message.length;
  }

  getRecipientLabel(): string {
    switch (this.recipientType) {
      case 'learners': return 'All Learners';
      case 'guardians': return 'All Guardians';
      case 'teachers': return 'All Teachers';
      case 'admins': return 'All Admins';
      case 'all': return 'Everyone (Learners + Guardians + Teachers)';
      case 'individual': return this.individualPhone || 'Individual';
      default: return '';
    }
  }

  getEndpoint(): string {
    switch (this.recipientType) {
      case 'learners': return `${this.apiUrl}/staff/notify/learners`;
      case 'guardians': return `${this.apiUrl}/staff/notify/guardians`;
      case 'teachers': return `${this.apiUrl}/staff/notify/teachers`;
      case 'admins': return `${this.apiUrl}/staff/notify/admins`;
      case 'all': return `${this.apiUrl}/staff/notify/everyone`;
      case 'individual': return `${this.apiUrl}/staff/notify/individual`;
      default: return '';
    }
  }

  quickSend(type: string) {
    this.recipientType = type;
    this.message = '';
    this.subject = '';
    this.successMessage = '';
    this.errorMessage = '';
  }

  triggerDailyLessons() {
    this.isSending = true;
    this.http.post(`${this.apiUrl}/lesson/daily/send`, {}, { withCredentials: true }).subscribe({
      next: () => {
        this.successMessage = 'Daily lesson SMS sent to all learners!';
        this.addLog('All Learners', 'Daily Lesson Summary');
        this.isSending = false;
      },
      error: () => {
        this.errorMessage = 'Failed to send daily lessons.';
        this.isSending = false;
      }
    });
  }

  triggerReminders() {
    this.isSending = true;
    this.http.post(`${this.apiUrl}/lesson/reminders/trigger`, {}, { withCredentials: true }).subscribe({
      next: () => {
        this.successMessage = 'Assignment & exam reminders sent!';
        this.addLog('All Learners', 'Assignment & Exam Reminders');
        this.isSending = false;
      },
      error: () => {
        this.errorMessage = 'Failed to trigger reminders.';
        this.isSending = false;
      }
    });
  }

  send() {
    if (!this.message.trim()) {
      this.errorMessage = 'Please enter a message.';
      return;
    }
    if (this.recipientType === 'individual' && !this.individualPhone.trim()) {
      this.errorMessage = 'Please enter a phone number.';
      return;
    }

    this.isSending = true;
    this.successMessage = '';
    this.errorMessage = '';

    const body: any = { message: this.message, subject: this.subject };
    if (this.recipientType === 'individual') {
      body.phoneNumber = this.individualPhone;
    }

    this.http.post(this.getEndpoint(), body, { withCredentials: true }).subscribe({
      next: () => {
        this.successMessage = `SMS sent to ${this.getRecipientLabel()} successfully!`;
        this.addLog(this.getRecipientLabel(), this.message);
        this.message = '';
        this.subject = '';
        this.isSending = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to send SMS.';
        this.isSending = false;
      }
    });
  }

  addLog(recipients: string, message: string) {
    this.logs.unshift({
      time: new Date().toLocaleTimeString(),
      recipients,
      message: message.length > 50 ? message.substring(0, 50) + '...' : message,
      status: 'Sent ✅'
    });
    if (this.logs.length > 10) this.logs.pop();
  }

  constructor(private http: HttpClient) {}
}
