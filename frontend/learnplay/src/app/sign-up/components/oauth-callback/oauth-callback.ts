import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  template: `<div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#F5F5FF] to-[#FBF4FC]">
    <span class="font-fredoka text-[#9333EA] text-2xl">Signing you in...</span>
  </div>`
})
export class OAuthCallbackComponent implements OnInit {
  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.getUserDetails().subscribe({
      next: () => {
        this.authService.scheduleRefresh();
        this.router.navigate(['/parent']);
      },
      error: () => this.router.navigate(['/sign-up/sign-in'])
    });
  }
}
