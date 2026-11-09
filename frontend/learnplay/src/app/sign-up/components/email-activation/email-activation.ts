import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-email-activation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './email-activation.html',
  styleUrl: './email-activation.css'
})
export class EmailActivation implements OnInit {
  success = false;
  isLoading = true;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const error = this.route.snapshot.queryParamMap.get('error');
    this.success = error === 'false';
    this.isLoading = false;
  }

  onGoToSignIn() {
    this.router.navigate(['/sign-up/sign-in']);
  }

  onGoToSignUp() {
    this.router.navigate(['/sign-up']);
  }
}
