import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { CourseService } from '../../../services/course.service';
import { localGet, localSet } from '../../../shared/components/utils/local-storage.util';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, SpinnerOverlayComponent, ToastNotificationComponent],
  templateUrl: './courses.html',
  styleUrl: './courses.css'
})
export class CoursesComponent implements OnInit {
  showForm = false;
  selectedCourseId: string = '';
  countries: any[] = [];
  courses: any[] = [];
  isLoading = false;
  editingCourseId: string | null = null;
  originalCourse: any = null;

  get hasChanges(): boolean {
    if (!this.editingCourseId || !this.originalCourse) return true;
    return (
      this.newCourse.title !== this.originalCourse.title ||
      this.newCourse.countryCode !== this.originalCourse.countryCode ||
      this.newCourse.shortCode !== this.originalCourse.shortCode ||
      this.newCourse.description !== this.originalCourse.description ||
      this.newCourse.premium !== this.originalCourse.premium ||
      this.newCourse.active !== this.originalCourse.active
    );
  }

  newCourse = {
    title: '',
    countryCode: '',
    shortCode: '',
    premium: false,
    description: '',
    active: true
  };

  curriculumOptions = [
    { code: 'CBC', name: 'Competence Based Curriculum (CBC)' },
    { code: 'KCPE', name: 'Kenya Certificate of Primary Education (KCPE)' },
    { code: 'KCSE', name: 'Kenya Certificate of Secondary Education (KCSE)' },
    { code: 'IB', name: 'International Baccalaureate (IB)' },
    { code: 'IGCSE', name: 'International General Certificate of Secondary Education (IGCSE)' },
    { code: 'AP', name: 'Advanced Placement (AP)' },
    { code: 'CBSE', name: 'Central Board of Secondary Education (CBSE)' },
    { code: 'ICSE', name: 'Indian Certificate of Secondary Education (ICSE)' }
  ];

  constructor(
    private router: Router,
    private courseService: CourseService,
    private http: HttpClient,
    public toast: ToastService
  ) {}

  ngOnInit() {
    this.loadStoredCourseId();
    this.loadCourses();
    this.loadCountries();
  }

  loadStoredCourseId() {
    const storedCourseId = localGet('selectedCourseId');
    if (storedCourseId) {
      this.selectedCourseId = storedCourseId;
    }
  }

  loadCourses() {
    this.isLoading = true;
    this.courseService.getAllCourses().subscribe({
      next: (apiCourses) => {
        this.courses = apiCourses.sort((a: any, b: any) => {
          return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
        });
        this.isLoading = false;
        console.log('Courses loaded:', this.courses);
      },
      error: (err: unknown) => {
        console.error('Error loading courses:', err);
        this.isLoading = false;
        this.toast.show('Couldn\'t load courses. Please try again.', 'error');
      }
    });
  }
  loadCountries(): void {
  this.http.get<any[]>('assets/countries.json').subscribe({
    next: (data) => {
      this.countries = data.sort((a, b) => a.name.localeCompare(b.name));
    },
    error: (err: unknown) => {
      console.error('Error loading countries:', err);
      this.toast.show('Couldn\'t load country list. Please refresh the page.', 'warning');
    }
  });
}


  selectCourse(courseId: string) {
    this.selectedCourseId = courseId;
    localSet('selectedCourseId', courseId);
    this.router.navigate(['/courses/dashboard', courseId]);
  }

  viewCourse(courseId: string) {
    this.selectCourse(courseId);
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.editingCourseId = null;
      this.resetForm();
    }
  }

  createCourse() {
    console.log('editingCourseId at submit:', this.editingCourseId);
    console.log('newCourse at submit:', JSON.stringify(this.newCourse));
    if (this.editingCourseId) {
      const updatePayload = { id: this.editingCourseId, ...this.newCourse };
      console.log('Update payload:', JSON.stringify(updatePayload));
      this.courseService.updateCourse(this.editingCourseId, updatePayload).subscribe({
        next: () => {
          this.showForm = false;
          this.editingCourseId = null;
          this.loadCourses();
          this.resetForm();
          this.toast.show('Course updated successfully!', 'success');
        },
        error: (err: unknown) => {
          console.error('Error updating course:', err);
          console.error('Error status:', (err as any).status);
          console.error('Error body:', JSON.stringify((err as any).error));
          this.toast.show('Couldn\'t update course. Please try again.', 'error');
        }
      });
      return;
    }
    const courseData = {
      title: this.newCourse.title,
      countryCode: this.newCourse.countryCode,
      shortCode: this.newCourse.shortCode,
      premium: this.newCourse.premium,
      description: this.newCourse.description,
      active: this.newCourse.active
    };

    this.courseService.createCourse(courseData).subscribe({
      next: (response: any) => {
        console.log('Course created:', response.id);
        this.selectedCourseId = response.id;
        localSet('selectedCourseId', response.id);
        this.showForm = false;
        this.loadCourses();
        this.resetForm();
        this.toast.show('Course created successfully!', 'success');
        this.router.navigate(['/courses/dashboard', response.id]);
      },
      error: (err: unknown) => {
        console.error('Error creating course:', err);
        this.toast.show('Couldn\'t create course. Please try again.', 'error');
      }
    });
  }

  resetForm() {
    this.newCourse = {
      title: '',
      countryCode: '',
      shortCode: '',
      premium: false,
      description: '',
      active: true
    };
  }

  onCurriculumChange(code: string) {
    this.newCourse.shortCode = code;
    if (!this.newCourse.title) {
      const match = this.curriculumOptions.find(c => c.code === code);
      if (match) this.newCourse.title = match.code;
    }
  }

  editCourse(course: any) {
    this.editingCourseId = course.id;
    this.originalCourse = { title: course.title, countryCode: course.countryCode, shortCode: course.shortCode, premium: course.premium, description: course.description, active: course.active };
    this.newCourse = { ...this.originalCourse };
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteCourse(course: any) {
    if (confirm(`Are you sure you want to delete "${course.title}"? This action cannot be undone.`)) {
      // For now, just show a message since the delete API might not be implemented
      this.toast.show('Delete functionality will be implemented soon.', 'info');
      // TODO: Implement actual delete when API is ready
      // this.courseService.deleteCourse(course.id).subscribe({
      //   next: () => {
      //     this.toast.show('Course deleted successfully!', 'success');
      //     this.loadCourses();
      //   },
      //   error: (err: unknown) => {
      //     console.error('Error deleting course:', err);
      //     this.toast.show('Failed to delete course. Please try again.', 'error');
      //   }
      // });
    }
  }
}