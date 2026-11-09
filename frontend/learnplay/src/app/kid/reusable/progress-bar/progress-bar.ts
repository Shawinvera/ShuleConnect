import { Component, Input } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [MatProgressBarModule, CommonModule],
  templateUrl: './progress-bar.html',
  styleUrls: ['./progress-bar.css'],
})
export class ProgressBar {
  @Input() value: number = 0;
  @Input() mode: 'determinate' | 'indeterminate' | 'buffer' | 'query' = 'determinate';
  @Input() bufferValue: number = 0;

  // Tailwind or hex color
  @Input() barColor: string = 'bg-blue-500';
}
