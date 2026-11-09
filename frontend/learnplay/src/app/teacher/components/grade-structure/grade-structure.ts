import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TeacherService } from '../../services/teacher.service';
import { HttpClientModule } from '@angular/common/http';
import { localGet, localSet } from '../../../shared/components/utils/local-storage.util';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { TeacherBreadcrumbComponent } from '../breadcrumb/teacher-breadcrumb';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-grade-structure',
  standalone: true,
  imports: [CommonModule, HttpClientModule, SpinnerOverlayComponent, TeacherBreadcrumbComponent, ToastNotificationComponent],
  templateUrl: './grade-structure.html',
  styleUrls: ['./grade-structure.css']
})
export class GradeStructure implements OnInit {
  courseId: string = '';
  courses: any[] = [];
  subjects: any[] = [];
  grades: any[] = [];
  selectedCourseId: string = '';
  selectedGradeId: string = '';
  selectedSubjectId: string = '';
  isLoading = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private teacherService: TeacherService,
    public toast: ToastService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      // ✅ Use localGet
      this.courseId = params['gradeId'] || localGet('gradeId') || '';
    });
    this.loadGrades();
  }

  navigateToGrade(grade: any) {
    const gradeId = grade.id;
    if (gradeId) {
      // ✅ Use localSet
      localSet('selectedGradeId', gradeId);
      this.router.navigate(['/courses/grade', gradeId]);
    } else {
      console.warn('No grade ID found for navigation');
    }
  }

  goBackToDashboard() {
    this.router.navigate(['/courses/dashboard', this.courseId]);
  }

  loadGrades() {
    const courseId = localGet('selectedCourseId') || localGet('courseId');
    if (courseId) {
      this.isLoading = true;
      this.teacherService.getGradesByCourse(courseId).subscribe({
        next: (grades) => {
          this.grades = (grades || []).map(g => ({
            id: g.id || g.gradeId,
            name: g.name || g.gradeName,
            description: g.description || 'No description',
            subjectsCount: 0,
            topicsCount: 0
          }));
          if (this.grades.length > 0) {
            this.selectedGradeId = this.grades[0].id;
            localSet('selectedGradeId', this.selectedGradeId);
          }
          this.isLoading = false;
          this.grades.forEach(grade => this.loadGradeCounts(grade));
        },
        error: (err: unknown) => {
          console.error('Error loading grades:', err);
          this.isLoading = false;
          this.toast.show('Couldn\'t load grade structure. Please try again.', 'error');
        }
      });
    }
  }

  loadGradeCounts(grade: any) {
    this.teacherService.getSubjectsByGrade(grade.id).subscribe({
      next: (subjects) => {
        grade.subjectsCount = subjects.length;
        grade.topicsCount = subjects.reduce((sum: number, gs: any) => sum + (gs.topicCount || 0), 0);
      },
      error: () => {
        grade.subjectsCount = 0;
        grade.topicsCount = 0;
      }
    });
  }

  loadSubjects() {
    this.teacherService.getSubjectsByCourse(this.selectedCourseId).subscribe({
      next: (subjects) => {
        this.subjects = subjects;
      },
      error: (err: unknown) => console.error('Error loading subjects:', err)
    });
  }

  assignSubjectToGrade() {
    const data = { gradeId: this.selectedGradeId, subjectId: this.selectedSubjectId };
    this.teacherService.createGradeSubject(data).subscribe({
      next: (response) => {
        const gradeSubjectId = response.generatedId;
        console.log('Grade-Subject created:', gradeSubjectId);
        this.router.navigate(['/teacher/topics'], {
          queryParams: { gradeId: this.selectedGradeId, subjectId: this.selectedSubjectId, gradeSubjectId }
        });
      },
      error: (err: unknown) => {
        console.error('Error assigning subject to grade:', err);
        this.toast.show('Couldn\'t assign subject to grade. Please try again.', 'error');
      }
    });
  }
}