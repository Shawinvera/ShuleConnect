import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TeacherBreadcrumbComponent } from '../breadcrumb/teacher-breadcrumb';
import {
  LessonQuizLessonOption,
  LessonQuizQuestionDraft,
  LessonQuizService,
  LessonQuizSummary,
} from '../../../services/lesson-quiz.service';

@Component({
  selector: 'app-manage-exams-quizzes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    TeacherBreadcrumbComponent
  ],
  templateUrl: './manage-exams-quizzes.html',
  styleUrl: './manage-exams-quizzes.css',
})
export class ManageExamsQuizzes implements OnInit {
  quizzes: LessonQuizSummary[] = [];
  lessons: LessonQuizLessonOption[] = [];
  questions: LessonQuizQuestionDraft[] = [this.newQuestion()];
  selectedLessonId = '';
  quizTitle = '';
  isFormOpen = false;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private lessonQuizService: LessonQuizService) {}

  ngOnInit(): void {
    this.loadData();
  }

  private newQuestion(): LessonQuizQuestionDraft {
    return { prompt: '', options: ['', '', '', ''], correctOptionIndex: null };
  }

  get availableLessons(): LessonQuizLessonOption[] {
    const assignedLessonIds = new Set(this.quizzes.map((quiz) => quiz.lessonId));
    return this.lessons.filter((lesson) => !assignedLessonIds.has(lesson.id));
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.lessonQuizService.getQuizzes().subscribe({
      next: (quizzes) => {
        this.quizzes = quizzes;
        this.lessonQuizService.getLessonOptions().subscribe({
          next: (lessons) => {
            this.lessons = lessons;
            this.isLoading = false;
          },
          error: () => {
            this.errorMessage = 'Could not load lessons for quiz creation.';
            this.isLoading = false;
          },
        });
      },
      error: () => {
        this.errorMessage = 'Could not load quizzes.';
        this.isLoading = false;
      },
    });
  }

  addQuestion(): void {
    if (this.questions.length < 50) {
      this.questions.push(this.newQuestion());
    }
  }

  removeQuestion(index: number): void {
    if (this.questions.length > 1) {
      this.questions.splice(index, 1);
    }
  }

  openCreateForm(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.quizTitle = '';
    this.selectedLessonId = '';
    this.questions = [this.newQuestion()];
    this.isFormOpen = true;
  }

  createQuiz(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.selectedLessonId) {
      this.errorMessage = 'Choose a lesson for this quiz.';
      return;
    }
    if (!this.quizTitle.trim()) {
      this.errorMessage = 'Enter a quiz title.';
      return;
    }
    if (
      this.questions.some(
        (question) =>
          !question.prompt.trim() ||
          question.options.some((option) => !option.trim()) ||
          question.correctOptionIndex === null,
      )
    ) {
      this.errorMessage = 'Complete each question, all four choices, and its correct answer.';
      return;
    }

    this.isSaving = true;
    this.lessonQuizService
      .createQuiz(this.selectedLessonId, this.quizTitle.trim(), this.questions)
      .subscribe({
        next: (quiz) => {
          this.quizzes = [quiz, ...this.quizzes];
          this.isSaving = false;
          this.isFormOpen = false;
          this.successMessage = 'Quiz published for the selected lesson.';
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Could not create the quiz.';
          this.isSaving = false;
        },
      });
  }
}