import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-dots',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-dots.html',
  styleUrl: './loading-dots.css'
})
export class LoadingDotsComponent implements OnInit, OnDestroy {
  @Input() text: string = 'Loading';
  @Input() color: string = '#667DE8';
  @Input() size: string = 'medium'; // 'small', 'medium', 'large'
  
  dotCount: number = 1;
  private intervalId: any;

  ngOnInit() {
    this.startAnimation();
  }

  ngOnDestroy() {
    this.stopAnimation();
  }

  private startAnimation() {
    this.intervalId = setInterval(() => {
      this.dotCount = this.dotCount >= 3 ? 1 : this.dotCount + 1;
    }, 500); // Change dots every 200ms (half a second)
  }

  private stopAnimation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  getDots(): string {
    return '.'.repeat(this.dotCount);
  }

  getSizeClass(): string {
    switch (this.size) {
      case 'small':
        return 'text-[16px] md:text-[18px]';
      case 'large':
        return 'text-[24px] md:text-[30px] lg:text-[35px]';
      default:
        return 'text-[20px] md:text-[25px]';
    }
  }
}