import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-lesson-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './lesson-card.html',
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;  
      overflow: hidden;
    }
  `]
})
export class LessonCard {
  @Input() lesson: any;
  @Input() index: number = 0;
  @Input() fallbackIcon: string = 'assets/subject-icons/maths.png';
  @Output() selected = new EventEmitter<any>();

  // Extract YouTube ID and return the HQ thumbnail URL
  get thumbnail(): string {
    if (!this.lesson?.videoUrl) return this.fallbackIcon;
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = this.lesson.videoUrl.match(regExp);
    
    if (match && match[2].length === 11) {
      return `https://img.youtube.com/vi/${match[2]}/sddefault.jpg`;
    }
    return this.fallbackIcon;
  }

  formatDuration(seconds: number): string {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    return `${mins}:00`;
  }

  onCardClick() {
    this.selected.emit(this.lesson);
  }
}