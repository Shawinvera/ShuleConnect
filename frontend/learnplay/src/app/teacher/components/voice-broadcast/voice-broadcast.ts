import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

interface BroadcastLog {
  time: string;
  recipients: string;
  message: string;
  status: 'Sent ✅' | 'Failed ❌';
}

@Component({
  selector: 'app-voice-broadcast',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './voice-broadcast.html',
  styleUrl: './voice-broadcast.css'
})
export class VoiceBroadcastComponent {
  apiUrl = environment.apiUrl;

  recipientType: 'guardians' | 'teachers' | 'all' | 'custom' = 'guardians';
  customPhones: string = '';
  language: string = 'en';
  message: string = '';
  charCount: number = 0;
  isSending: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  logs: BroadcastLog[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  onMessageChange(): void {
    this.charCount = this.message.length;
  }

  getRecipientLabel(): string {
    switch (this.recipientType) {
      case 'guardians': return 'All Parents & Guardians';
      case 'teachers': return 'All Teachers';
      case 'all': return 'All Staff (Teachers + Admins)';
      case 'custom': return 'Custom Phone Numbers';
      default: return '';
    }
  }

  send(): void {
    if (!this.message.trim()) {
      this.errorMessage = 'Please enter a message.';
      return;
    }

    this.isSending = true;
    this.successMessage = '';
    this.errorMessage = '';

    const postBroadcast = (phoneNumbers: string[]) => {
      this.http.post(
        `${this.apiUrl}/voice/broadcast`,
        { phoneNumbers, message: this.message, language: this.language },
        { withCredentials: true, responseType: 'text' as const }
      ).subscribe({
        next: () => {
          this.addLog(this.getRecipientLabel(), this.message, 'Sent ✅');
          this.successMessage = `Voice broadcast sent to ${this.getRecipientLabel()} successfully!`;
          this.message = '';
          this.charCount = 0;
          this.isSending = false;
        },
        error: (err) => {
          this.addLog(this.getRecipientLabel(), this.message, 'Failed ❌');
          this.errorMessage = err.error?.message || 'Failed to send voice broadcast.';
          this.isSending = false;
        }
      });
    };

    if (this.recipientType === 'guardians') {
      this.http.get<any[]>(`${this.apiUrl}/staff/guardians`, { withCredentials: true }).subscribe({
        next: (data) => postBroadcast(data.map((g: any) => g.phoneNumber).filter(Boolean)),
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to fetch guardians.';
          this.isSending = false;
        }
      });
    } else if (this.recipientType === 'teachers') {
      this.http.get<any[]>(`${this.apiUrl}/staff/teachers`, { withCredentials: true }).subscribe({
        next: (data) => postBroadcast(data.map((t: any) => t.phoneNumber).filter(Boolean)),
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to fetch teachers.';
          this.isSending = false;
        }
      });
    } else if (this.recipientType === 'all') {
      forkJoin([
        this.http.get<any[]>(`${this.apiUrl}/staff/guardians`, { withCredentials: true }),
        this.http.get<any[]>(`${this.apiUrl}/staff/teachers`, { withCredentials: true })
      ]).subscribe({
        next: ([guardians, teachers]) => {
          const phones = [
            ...guardians.map((g: any) => g.phoneNumber),
            ...teachers.map((t: any) => t.phoneNumber)
          ].filter(Boolean);
          postBroadcast(phones);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to fetch recipients.';
          this.isSending = false;
        }
      });
    } else if (this.recipientType === 'custom') {
      const phones = this.customPhones
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);
      postBroadcast(phones);
    }
  }

  addLog(recipients: string, message: string, status: 'Sent ✅' | 'Failed ❌'): void {
    this.logs.unshift({
      time: new Date().toLocaleTimeString(),
      recipients,
      message: message.length > 50 ? message.substring(0, 50) + '...' : message,
      status
    });
    if (this.logs.length > 10) this.logs.pop();
  }
}
