import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ParentApiService, GradeDto, CourseDto } from '../../services/parent-api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { AvatarService, AvatarInfo } from '../../../services/avatar.service';
import { AuthService } from '../../../services/auth.service';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification';
import { PhotoUploadComponent } from '../../../shared/components/photo-upload/photo-upload';
import { ParentNavbar } from '../parent-navbar/parent-navbar';
import { Navbar } from '../../../kid/reusable/navbar/navbar';

@Component({
  selector: 'app-edit-learner-profile',
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
    ToastNotificationComponent,
    PhotoUploadComponent,
    ParentNavbar,
    Navbar,
  ],
  templateUrl: './edit-learner-profile.html',
  styleUrl: './edit-learner-profile.css',
})
export class EditLearnerProfile implements OnInit {
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
  profilePhotoUrl = ''; // Cloudinary secure_url
  photoSourceType: 'avatar' | 'photo' = 'avatar';
  isUploadingPhoto = false;

  // Logic State
  isSubmitting = false;
  isLoadingData = false;
  currentLearner: any = null;

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
  referrer = '';

  get isFromKid(): boolean { return this.referrer === 'kid'; }

  constructor(
    private parentApiService: ParentApiService,
    public router: Router,
    private route: ActivatedRoute,
    public toast: ToastService,
    private avatarService: AvatarService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.referrer = this.route.snapshot.queryParams['from'] || 'parent';
    // Get learner data from localStorage (set by child-details component)
    const data = localStorage.getItem('selectedLearnerForEdit');
    if (data) {
      this.currentLearner = JSON.parse(data);
      
      // Store the selected learner ID for later use
      localStorage.setItem('selectedLearnerId', this.currentLearner.id);
      
      this.firstName = this.currentLearner.firstName;
      this.lastName = this.currentLearner.lastName;
      this.username = this.currentLearner.preferredName;
      
      // Correctly initialize the Date object for the picker
      if (this.currentLearner.dob) {
        this.dateOfBirth = new Date(this.currentLearner.dob);
      }
      
      this.birthCertNumber = this.currentLearner.birthCertificateNumber || '';
      this.gender = this.currentLearner.gender;
      this.selectedAvatar = this.currentLearner.avatar;

      // Detect if existing avatar is a URL (own photo) or filename
      if (this.currentLearner.avatar && this.currentLearner.avatar.startsWith('http')) {
        this.photoSourceType = 'photo';
        this.profilePhotoUrl = this.currentLearner.avatar;
        this.selectedAvatar = '';
      } else {
        this.photoSourceType = 'avatar';
      }
      this.selectedCourseId = this.currentLearner.courseId;
      this.selectedGradeId = this.currentLearner.gradeId;

      this.loadAvatars();
    } else {
      // If no learner data, redirect back to parent dashboard
      this.router.navigate(['/parent']);
      return;
    }
    
    // Fetch courses and grades
    this.fetchCoursesAndGrades();
  }

  fetchCoursesAndGrades() {
    this.isLoadingData = true;
    
    this.parentApiService.fetchAllCourses().subscribe({
      next: (courses) => {
        this.courses = courses.filter((c) => c.active !== false);
        
        if (courses.length === 0) {
          this.isLoadingData = false;
          return;
        }
        
        let completed = 0;
        
        courses.forEach((course) => {
          this.parentApiService.fetchGradesByCourse(course.id).subscribe({
            next: (grades) => {
              this.allGradesMap[course.id] = grades;
              completed++;
              
              if (completed === courses.length) {
                this.isLoadingData = false;
                
                // Populate grades for the selected course
                if (this.selectedCourseId && this.allGradesMap[this.selectedCourseId]) {
                  this.grades = this.allGradesMap[this.selectedCourseId];
                }
              }
            },
            error: (err) => {
              console.error(`Error fetching grades for course ${course.id}:`, err);
              completed++;
              
              if (completed === courses.length) {
                this.isLoadingData = false;
              }
            }
          });
        });
      },
      error: (err) => {
        console.error('Error fetching courses:', err);
        this.isLoadingData = false;
      }
    });
  }

  onCourseChange(resetGrade = true) {
    if (resetGrade) {
      this.selectedGradeId = '';
    }
    
    if (this.selectedCourseId && this.allGradesMap[this.selectedCourseId]) {
      this.grades = this.allGradesMap[this.selectedCourseId];
    } else {
      this.grades = [];
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

  setPhotoSource(type: 'avatar' | 'photo') {
    this.photoSourceType = type;
  }

  onPhotoUploaded(secureUrl: string) {
    this.profilePhotoUrl = secureUrl;
  }

  onUploadingChange(uploading: boolean) {
    this.isUploadingPhoto = uploading;
  }

  onUpdate() {
    if (!this.firstName || !this.lastName || !this.dateOfBirth || !this.selectedGradeId) {
      this.toast.show('Please fill in all required fields.', 'error');
      return;
    }

    const hasProfilePic =
      this.photoSourceType === 'avatar' ? !!this.selectedAvatar : !!this.profilePhotoUrl;
    if (!hasProfilePic) {
      this.toast.show(
        this.photoSourceType === 'avatar' ? 'Please select an avatar.' : 'Please upload a photo.',
        'error',
      );
      return;
    }

    this.isSubmitting = true;

    // Robust date formatting (handles both Date object and string)
    let formattedDate = this.dateOfBirth;
    if (this.dateOfBirth instanceof Date) {
      // Offset timezone to ensure the date doesn't "jump" a day back
      const offset = this.dateOfBirth.getTimezoneOffset();
      const correctedDate = new Date(this.dateOfBirth.getTime() - offset * 60 * 1000);
      formattedDate = correctedDate.toISOString().split('T')[0];
    }

    // Construct the payload to match your required JSON structure
    const payload = {
      ...this.currentLearner, // Keeps id, appUserId, gradeName, etc.
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      preferredName: this.username.trim(),
      dob: formattedDate,
      gender: this.gender,
      birthCertificateNumber: this.birthCertNumber,
      courseId: this.selectedCourseId,
      gradeId: this.selectedGradeId,
      avatar: this.photoSourceType === 'photo' ? this.profilePhotoUrl : this.selectedAvatar,
    };

    this.parentApiService.updateLearnerProfile(payload).subscribe({
      next: (response: any) => {
        this.toast.show('Profile updated successfully! ✨', 'success');

        // Update learners list in localStorage
        const learners = localStorage.getItem('learners');
        if (learners) {
          const learnersArray = JSON.parse(learners);
          const updatedLearners = learnersArray.map((learner: any) => 
            learner.id === response.id ? response : learner
          );
          localStorage.setItem('learners', JSON.stringify(updatedLearners));
        }

        // Clean up the temporary edit data
        localStorage.removeItem('selectedLearnerForEdit');

        // Refresh user data to get updated learners and update selectedChild
        this.authService.refreshUserDataAndUpdateSelectedChild().subscribe({
          next: () => {
            console.log('User data and selectedChild refreshed after learner profile update');
            setTimeout(() => {
              if (this.referrer === 'kid') {
                this.router.navigate(['/kid']);
              } else {
                this.router.navigate(['/parent/child', this.currentLearner.id]);
              }
            }, 1200);
          },
          error: (err) => {
            console.error('Failed to refresh user data:', err);
            setTimeout(() => {
              if (this.referrer === 'kid') {
                this.router.navigate(['/kid']);
              } else {
                this.router.navigate(['/parent/child', this.currentLearner.id]);
              }
            }, 1200);
          }
        });
      },
      error: (err: any) => {
        console.error('Update failed', err);
        this.toast.show('Failed to update profile', 'error');
        this.isSubmitting = false;
      },
    });
  }

  // --- Avatar Logic ---
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