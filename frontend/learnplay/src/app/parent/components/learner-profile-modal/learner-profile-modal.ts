import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { ParentApiService, GradeDto, CourseDto } from '../../services/parent-api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { AvatarService, AvatarInfo } from '../../../services/avatar.service';
import { AuthService } from '../../../services/auth.service';
import { LearnerService } from '../../../kid/services/learner/learner';

@Component({
  selector: 'app-learner-profile-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule,
  ],
  templateUrl: './learner-profile-modal.html',
  styleUrl: './learner-profile-modal.css',
})
export class LearnerProfileModal implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() learner: any = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() profileUpdated = new EventEmitter<any>();

  // Form Fields
  firstName = '';
  lastName = '';
  username = '';
  dateOfBirth: any = null;
  birthCertNumber = '';
  selectedCourseId = '';
  selectedGradeId = '';
  gender: 'MALE' | 'FEMALE' = 'MALE';
  selectedAvatar = '';

  // Logic State
  isSubmitting = false;
  isLoadingData = false;

  // Data Lists
  courses: CourseDto[] = [];
  grades: GradeDto[] = [];
  allGradesMap: { [courseId: string]: GradeDto[] } = {};
  avatars: AvatarInfo[] = [];

  // Date constraints
  maxDate: Date = new Date();
  minDate: Date = new Date(new Date().getFullYear() - 100, 0, 1);

  // Modal State
  isAvatarModalOpen = false;
  isLoadingAvatars = false;

  constructor(
    private parentApiService: ParentApiService,
    public toast: ToastService,
    private avatarService: AvatarService,
    private learnerService: LearnerService,
  ) {}

  ngOnInit() {
    this.fetchCoursesAndGrades();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['learner'] && this.learner) {
      this.populateForm();
    }
  }

  populateForm() {
    if (!this.learner) return;

    this.firstName = this.learner.firstName || '';
    this.lastName = this.learner.lastName || '';
    this.username = this.learner.preferredName || '';
    
    if (this.learner.dob) {
      this.dateOfBirth = new Date(this.learner.dob);
    }
    
    this.birthCertNumber = this.learner.birthCertificateNumber || '';
    this.gender = this.learner.gender || 'MALE';
    this.selectedAvatar = this.learner.avatar || '';
    this.selectedCourseId = this.learner.courseId || '';
    this.selectedGradeId = this.learner.gradeId || '';

    this.loadAvatars();
  }

  fetchCoursesAndGrades() {
    this.isLoadingData = true;
    this.parentApiService.fetchAllCourses().subscribe({
      next: (courses) => {
        this.courses = courses.filter((c) => c.active !== false);
        let completed = 0;
        courses.forEach((course) => {
          this.parentApiService.fetchGradesByCourse(course.id).subscribe({
            next: (grades) => {
              this.allGradesMap[course.id] = grades;
              completed++;
              if (completed === courses.length) {
                this.isLoadingData = false;
                this.onCourseChange(false);
              }
            },
          });
        });
      },
    });
  }

  onCourseChange(resetGrade = true) {
    if (resetGrade) this.selectedGradeId = '';
    if (this.selectedCourseId && this.allGradesMap[this.selectedCourseId]) {
      this.grades = this.allGradesMap[this.selectedCourseId];
    }
  }

  onGenderChange() {
    this.loadAvatars();
  }

  loadAvatars() {
    this.isLoadingAvatars = true;
    this.avatarService.getAvatarsByGender(this.gender).subscribe({
      next: (avatars) => {
        this.avatars = avatars;
        this.isLoadingAvatars = false;
      },
    });
  }

  onUpdate() {
    if (!this.firstName || !this.lastName || !this.dateOfBirth || !this.selectedGradeId) {
      this.toast.show('Please fill in all required fields.', 'error');
      return;
    }

    this.isSubmitting = true;

    let formattedDate = this.dateOfBirth;
    if (this.dateOfBirth instanceof Date) {
      const offset = this.dateOfBirth.getTimezoneOffset();
      const correctedDate = new Date(this.dateOfBirth.getTime() - offset * 60 * 1000);
      formattedDate = correctedDate.toISOString().split('T')[0];
    }

    const payload = {
      ...this.learner,
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      preferredName: this.username.trim(),
      dob: formattedDate,
      gender: this.gender,
      birthCertificateNumber: this.birthCertNumber,
      courseId: this.selectedCourseId,
      gradeId: this.selectedGradeId,
      avatar: this.selectedAvatar,
    };

    this.parentApiService.updateLearnerProfile(payload).subscribe({
      next: (response: any) => {
        this.toast.show('Profile updated successfully! ✨', 'success');
        this.learnerService.updateSelectedLearner(response);
        localStorage.setItem('selectedLearner', JSON.stringify(response));
        this.profileUpdated.emit(response);
        this.onClose();
      },
      error: (err: any) => {
        console.error('Update failed', err);
        this.toast.show('Failed to update profile', 'error');
        this.isSubmitting = false;
      },
    });
  }

  onClose() {
    this.isSubmitting = false;
    this.closeModal.emit();
  }

  // Avatar Logic
  openAvatarModal() {
    this.isAvatarModalOpen = true;
  }

  closeAvatarModal() {
    this.isAvatarModalOpen = false;
  }

  selectAvatar(avatar: AvatarInfo) {
    this.selectedAvatar = avatar.filename;
    this.closeAvatarModal();
  }

  getSelectedAvatarPath() {
    return this.avatarService.getAvatarPath(this.selectedAvatar, this.gender);
  }
}