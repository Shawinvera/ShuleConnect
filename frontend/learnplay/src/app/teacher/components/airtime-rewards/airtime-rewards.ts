import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface RewardLog {
  time: string;
  phone: string;
  type: string;
  amount: string;
  status: string;
}

@Component({
  selector: 'app-airtime-rewards',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './airtime-rewards.html',
  styleUrl: './airtime-rewards.css'
})
export class AirtimeRewardsComponent {
  apiUrl = environment.apiUrl;

  // Single reward
  phoneNumber = '';
  rewardType = 'ATTENDANCE';
  quizScore = 80;
  customAmount = 10;

  // Bulk reward
  bulkPhones = '';
  bulkAmount = 10;
  bulkCurrency = 'KES';

  isSending = false;
  successMessage = '';
  errorMessage = '';
  logs: RewardLog[] = [];

  constructor(private http: HttpClient) {}

  getRewardAmount(): string {
    switch (this.rewardType) {
      case 'ATTENDANCE': return 'KES 5';
      case 'QUIZ': return this.quizScore >= 80 ? 'KES 10' : 'KES 5';
      case 'COURSE': return 'KES 20';
      case 'CUSTOM': return 'KES ' + this.customAmount;
      default: return 'KES 5';
    }
  }

  getRewardLabel(): string {
    switch (this.rewardType) {
      case 'ATTENDANCE': return 'Attendance';
      case 'QUIZ': return 'Quiz Score';
      case 'COURSE': return 'Course Completion';
      case 'CUSTOM': return 'Custom Reward';
      default: return 'Reward';
    }
  }

  sendReward() {
    if (!this.phoneNumber.trim()) {
      this.errorMessage = 'Please enter a phone number.';
      return;
    }

    this.isSending = true;
    this.successMessage = '';
    this.errorMessage = '';

    let body: any;
    let endpoint: string;

    if (this.rewardType === 'CUSTOM') {
      body = { phoneNumber: this.phoneNumber, currencyCode: 'KES', amount: String(this.customAmount) };
      endpoint = `${this.apiUrl}/airtime/send`;
    } else {
      body = { phoneNumber: this.phoneNumber, type: this.rewardType, score: this.quizScore };
      endpoint = `${this.apiUrl}/airtime/reward`;
    }

    this.http.post(endpoint, body, { withCredentials: true, responseType: 'text' }).subscribe({
      next: () => {
        this.successMessage = `${this.getRewardAmount()} airtime sent to ${this.phoneNumber} via Africa's Talking!`;
        this.addLog(this.phoneNumber, this.getRewardLabel(), this.getRewardAmount());
        this.phoneNumber = '';
        this.isSending = false;
      },
      error: (err) => {
        this.errorMessage = err.error || 'Failed to send airtime reward.';
        this.isSending = false;
      }
    });
  }

  sendBulkReward() {
    const phones = this.bulkPhones.split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (phones.length === 0) {
      this.errorMessage = 'Please enter at least one phone number.';
      return;
    }

    this.isSending = true;
    this.successMessage = '';
    this.errorMessage = '';

    const recipients = phones.map(phone => ({
      phoneNumber: phone,
      currencyCode: this.bulkCurrency,
      amount: String(this.bulkAmount)
    }));

    this.http.post(`${this.apiUrl}/airtime/send-bulk`, recipients, { withCredentials: true, responseType: 'text' }).subscribe({
      next: () => {
        this.successMessage = `${this.bulkCurrency} ${this.bulkAmount} airtime sent to ${phones.length} learner(s) via Africa's Talking!`;
        phones.forEach(p => this.addLog(p, 'Bulk Reward', `${this.bulkCurrency} ${this.bulkAmount}`));
        this.bulkPhones = '';
        this.isSending = false;
      },
      error: (err) => {
        this.errorMessage = err.error || 'Failed to send bulk airtime.';
        this.isSending = false;
      }
    });
  }

  addLog(phone: string, type: string, amount: string) {
    this.logs.unshift({
      time: new Date().toLocaleTimeString(),
      phone,
      type,
      amount,
      status: 'Sent ✅'
    });
    if (this.logs.length > 10) this.logs.pop();
  }
}
