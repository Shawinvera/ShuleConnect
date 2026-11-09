import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TeacherBreadcrumbComponent } from '../breadcrumb/teacher-breadcrumb';

export interface ExamData {
  title: string;
  type: string;
  subject: string;
  questions: number;
  points: number;
}

@Component({
  selector: 'app-manage-exams-quizzes',
  standalone: true,
  imports: [
    CommonModule, 
    MatTableModule, 
    MatButtonModule, 
    MatIconModule,
    TeacherBreadcrumbComponent
  ],
  templateUrl: './manage-exams-quizzes.html',
  styleUrl: './manage-exams-quizzes.css',
})
export class ManageExamsQuizzes {
  displayedColumns: string[] = ['title', 'type', 'subject', 'questions', 'points', 'actions'];
  
  dataSource: ExamData[] = [
    { title: 'Subject', type: 'Unit Quiz', subject: 'Math', questions: 10, points: 100 },
    { title: 'Science', type: 'Unit Quiz', subject: 'Math', questions: 10, points: 100 },
    { title: 'English', type: 'Subject Quiz', subject: 'Science', questions: 25, points: 250 },
  ];
}