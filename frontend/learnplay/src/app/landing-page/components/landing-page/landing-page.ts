import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PosthogService } from '../../../services/posthog.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css'
})
export class LandingPage {
  constructor(
    private router: Router,
    private posthogService: PosthogService
  ) {}

  onGetStarted() {
    this.posthogService.posthog.capture('landing_page_get_started_clicked', {
      source: 'landing_page',
      button_text: "Let's Start!"
    });
    this.router.navigate(['/sign-up/sign-in']);
  }
}