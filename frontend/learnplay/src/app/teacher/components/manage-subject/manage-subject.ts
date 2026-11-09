import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TeacherService } from '../../services/teacher.service';
import { SpinnerOverlayComponent } from '../../../shared/components/spinner-overlay/spinner-overlay';
import { TeacherBreadcrumbComponent } from '../breadcrumb/teacher-breadcrumb';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../shared/services/toast.service';

// --- Types ---
export interface Subject {
  id: string;
  name: string;
  icon: string;
  description: string;
  colour: string;
}

export interface SubjectFormData {
  name: string;
  icon: string;
  description: string;
  colour: string;
}

// --- Constants ---
export const INITIAL_SUBJECTS: Subject[] = [];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerOverlayComponent, TeacherBreadcrumbComponent, ToastNotificationComponent],
  templateUrl: './manage-subject.html'
})
export class ManageSubject implements OnInit {
  // State
  subjects: Subject[] = [];
  isFormVisible = false;
  courses: any[] = [];
  selectedCourseId: string = '';
  selectedSubjectId: string = '';
  courseId: string = '';
  isLoading = false;
  
  formData: SubjectFormData = {
    name: '',
    icon: '',
    description: '',
    colour: ''
  };

  originalFormData: SubjectFormData = {
    name: '',
    icon: '',
    description: '',
    colour: ''
  };

  isIconPickerOpen = false;
  isColourPickerOpen = false;

  subjectColours = [
    '#EF4444','#F97316','#F59E0B','#EAB308','#84CC16','#22C55E','#10B981',
    '#14B8A6','#06B6D4','#3B82F6','#6366F1','#8B5CF6','#A855F7','#EC4899',
    '#F43F5E','#64748B','#6B7280','#374151','#1E293B','#0F172A',
    '#FCA5A5','#FCD34D','#6EE7B7','#93C5FD','#C4B5FD','#F9A8D4',
    '#DCFCE7','#DBEAFE','#EDE9FE','#FEF9C3'
  ];

  assetIcons = [
    'art.png','biology.png','christian religous education.webp',
    'english.png','geography.png','german.png','history and Government.png',
    'home-science.jpg','islam.png','journalism.png','kiswahili.png',
    'mathematics.png','maths.png','music.png','science.png',
    'spanish.png','subject.png','Subject1.png'
  ];

  getIconPath(icon: string): string {
    return `assets/subject-icons/${icon}`;
  }

  openIconPicker() { this.isIconPickerOpen = true; }
  closeIconPicker() { this.isIconPickerOpen = false; }
  openColourPicker() { this.isColourPickerOpen = true; }
  closeColourPicker() { this.isColourPickerOpen = false; }
  selectColour(colour: string) { this.formData.colour = colour; this.closeColourPicker(); }

  selectIcon(path: string) {
    // Store only the filename so backend saves e.g. 'math.png' not the full path
    this.formData.icon = path.split('/').pop() || path;
    this.closeIconPicker();
  }

  constructor(private teacherService: TeacherService, private router: Router, private route: ActivatedRoute, public toast: ToastService) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.courseId = params['courseId'] || (typeof localStorage !== 'undefined' ? localStorage.getItem('selectedCourseId') : null) || '';
      this.selectedCourseId = this.courseId;
      
      // Initialize selectedSubjectId from localStorage
      this.selectedSubjectId = (typeof localStorage !== 'undefined' ? localStorage.getItem('selectedSubjectId') : null) || '';
    });
    this.loadCourses();
  }

  toggleForm() {
    this.isFormVisible = !this.isFormVisible;
    if (!this.isFormVisible) {
      this.resetForm();
    }
  }

  resetForm() {
    this.formData = { name: '', icon: '', description: '', colour: '' };
    this.originalFormData = { name: '', icon: '', description: '', colour: '' };
    this.selectedSubjectId = '';
  }

  get isFormChanged(): boolean {
    if (!this.selectedSubjectId) return true;
    return this.formData.name !== this.originalFormData.name ||
           this.formData.icon !== this.originalFormData.icon ||
           this.formData.description !== this.originalFormData.description ||
           this.formData.colour !== this.originalFormData.colour;
  }

  onSubmit() {
    if (this.formData.name && this.selectedCourseId) {
      const subjectData = {
        name: this.formData.name,
        description: this.formData.description || 'No description',
        active: true,
        courseId: this.selectedCourseId,
        iconName: this.formData.icon,
        colour: this.formData.colour
      };

      const savedColour = this.formData.colour;
      const isEditing = !!this.selectedSubjectId && this.subjects.some(s => s.id === this.selectedSubjectId);

      if (isEditing) {
        const updateData = {
          id: this.selectedSubjectId,
          name: this.formData.name,
          description: this.formData.description || 'No description',
          active: true,
          courseId: this.selectedCourseId,
          iconName: this.formData.icon,
          colour: savedColour
        };
        console.log('=== UPDATE PAYLOAD ===', JSON.stringify(updateData, null, 2));
        this.teacherService.updateSubject(updateData).subscribe({
          next: (response) => {
            if (response && response.successful === false) {
              this.toast.show(response.errorMessage || 'Couldn\'t update subject. Please try again.', 'error');
              return;
            }
            this.saveColourToStorage(this.selectedSubjectId, savedColour);
            this.isFormVisible = false;
            this.resetForm();
            this.loadSubjects();
            this.toast.show('Subject updated successfully!', 'success');
          },
          error: (err) => {
            console.error('Update subject error:', err);
            this.toast.show(err?.error?.errorMessage || 'Couldn\'t update subject. Please try again.', 'error');
          }
        });
        return;
      }

      this.teacherService.createSubject(subjectData).subscribe({
        next: (response) => {
          const subjectId = response.id;
          this.selectedSubjectId = subjectId;
          if (typeof localStorage !== 'undefined') localStorage.setItem('selectedSubjectId', subjectId);
          this.saveColourToStorage(subjectId, savedColour);
          this.isFormVisible = false;
          this.resetForm();
          this.loadSubjects();
          this.toast.show('Subject created successfully!', 'success');
        },
        error: (error) => {
          console.error('Error creating subject:', error);
          this.toast.show('Couldn\'t create subject. Please try again.', 'error');
        }
      });
    }
  }

  loadCourses() {
    this.teacherService.getCourses().subscribe({
      next: (courses) => {
        this.courses = courses;
        if (courses.length > 0 && !this.selectedCourseId) {
          this.selectedCourseId = courses[0].id;
          this.courseId = this.selectedCourseId;
        }
        this.loadSubjects();
      },
      error: (error) => {
        console.error('Error loading courses:', error);
        this.toast.show('Couldn\'t load courses. Please try again.', 'error');
      }
    });
  }

  loadSubjects() {
    if (!this.selectedCourseId) return;
    this.isLoading = true;
    this.teacherService.getSubjectsByCourse(this.selectedCourseId).subscribe({
      next: (subjects) => {
        const storedColours = this.getColoursFromStorage();
        const iconMap: Record<string, string> = {};
        this.subjects = subjects.map(subject => {
          const icon = subject.iconName || '';
          if (icon) iconMap[subject.id] = icon;
          return {
            id: subject.id,
            name: subject.name,
            icon: icon ? `assets/subject-icons/${icon}` : '',
            description: subject.description || 'No description',
            colour: subject.colour || storedColours[subject.id] || ''
          };
        });
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('subjectIcons', JSON.stringify(iconMap));
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading subjects:', error);
        this.subjects = [];
        this.isLoading = false;
        this.toast.show('Couldn\'t load subjects. Please try again.', 'error');
      }
    });
  }

  handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this subject?')) {
      this.subjects = this.subjects.filter(s => s.id !== id);
    }
  }

  handleEdit(id: string) {
    const subject = this.subjects.find(s => s.id === id);
    if (!subject) return;
    this.selectedSubjectId = id;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('selectedSubjectId', id);
    }
    const rawIcon = subject.icon.replace('assets/subject-icons/', '');
    const validIcon = this.assetIcons.includes(rawIcon) ? rawIcon : '';
    this.formData = {
      name: subject.name,
      icon: validIcon,
      description: subject.description,
      colour: subject.colour || ''
    };
    this.originalFormData = { ...this.formData };
    this.isFormVisible = true;
  }

  private saveColourToStorage(subjectId: string, colour: string) {
    if (typeof localStorage === 'undefined') return;
    const colours = JSON.parse(localStorage.getItem('subjectColours') || '{}');
    colours[subjectId] = colour;
    localStorage.setItem('subjectColours', JSON.stringify(colours));
  }

  private getColoursFromStorage(): Record<string, string> {
    if (typeof localStorage === 'undefined') return {};
    return JSON.parse(localStorage.getItem('subjectColours') || '{}');
  }

  goBackToDashboard() {
    this.router.navigate(['/courses/dashboard', this.courseId]);
  }

  goToGradeDetail() {
    const gradeId = typeof localStorage !== 'undefined' ? localStorage.getItem('selectedGradeId') : null;
    if (gradeId) {
      this.router.navigate(['/courses/grade', gradeId]);
    } else {
      this.router.navigate(['/courses/grades', this.courseId]);
    }
  }

  navigateToGradeStructure() {
    this.router.navigate(['/courses/content', this.courseId]);
  }
}