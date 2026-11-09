import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-spinner-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spinner-overlay.html',
  styleUrl: './spinner-overlay.css'
})
export class SpinnerOverlayComponent {
  @Input() inline = false;
}
