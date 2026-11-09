import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TeacherService } from '../../../services/teacher.service';
import { HttpClientModule } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { localGet, localSet } from '../../../../shared/components/utils/local-storage.util';
import { SpinnerOverlayComponent } from '../../../../shared/components/spinner-overlay/spinner-overlay';
import { TeacherBreadcrumbComponent } from '../../breadcrumb/teacher-breadcrumb';
import { ToastNotificationComponent } from '../../../../shared/components/toast-notification/toast-notification';
import { ToastService } from '../../../../shared/services/toast.service';

interface SubjectCard {
  id: string;
  subjectId: string;
  gradeSubjectId: string;
  name: string;
  iconName: string;
  description: string;
  stats: {
    label: string;
    value: string;
    color: 'blue' | 'green';
  }[];
}

@Component({
  selector: 'app-grade-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, SpinnerOverlayComponent, TeacherBreadcrumbComponent, ToastNotificationComponent],
  templateUrl: './grade-detail.html'
})
export class GradeDetailComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private teacherService = inject(TeacherService);
  public toast = inject(ToastService);

  isFormVisible = false;
  selectedSubject = '';
  grades: any[] = [];
  availableSubjects: any[] = [];
  selectedGradeId = '';
  selectedSubjectId = '';
  courseId = '';
  gradeSubjectId = '';
  topicForm: any;
  gradeName = 'Grade';
  gradeDescription = '';
  subjects: SubjectCard[] = [];
  isLoading = false;

  assetIcons = [
    'art.png','biology.png','christian religous education.webp',
    'english.png','geography.png','german.png','history and Government.png',
    'home-science.jpg','islam.png','journalism.png','kiswahili.png',
    'mathematics.png','maths.png','music.png','science.png',
    'spanish.png','subject.png','Subject1.png'
  ];

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const routeGradeId = params.get('gradeId');
      const routeGradeSubjectId = params.get('gradeSubjectId');

      // ✅ Use localGet instead of direct localStorage
      this.selectedGradeId = routeGradeId || localGet('selectedGradeId') || '';
      this.gradeSubjectId = routeGradeSubjectId || localGet('selectedGradeSubjectId') || '';
      this.courseId = localGet('selectedCourseId') || '';

      // ✅ Persist latest values
      if (this.selectedGradeId) localSet('selectedGradeId', this.selectedGradeId);
      if (this.gradeSubjectId) localSet('selectedGradeSubjectId', this.gradeSubjectId);

      console.log('Active Grade ID:', this.selectedGradeId);
      console.log('Active GradeSubject ID:', this.gradeSubjectId);

      this.loadSubjectsOnly();
      this.loadGradeDetails();
      this.updateUrlWithGradeId();
    });
  }

  getSubjectIcon(iconName: string): string {
    if (!iconName) return 'assets/subject-icons/subject.png';
    const filename = iconName.split('/').pop() || iconName;
    const match = this.assetIcons.find(i => i.toLowerCase() === filename.toLowerCase());
    return match ? `assets/subject-icons/${match}` : 'assets/subject-icons/subject.png';
  }

  toggleForm() {
    this.isFormVisible = !this.isFormVisible;
    if (!this.isFormVisible) {
      this.selectedSubjectId = '';
    } else {
      this.loadSubjectsOnly();
    }
  }

  loadGradeId(): void {
    if (this.courseId && this.selectedGradeId.startsWith('course-')) {
      this.teacherService.getGradesByCourse(this.courseId).subscribe({
        next: (grades: any[]) => {
          if (grades.length > 0) {
            this.selectedGradeId = grades[0].id;
            // ✅ Use localSet
            localSet('selectedGradeId', this.selectedGradeId);
            console.log('Updated Grade ID:', this.selectedGradeId);
          }
        },
        error: (err: unknown) => console.error('Error loading grades:', err)
      });
    }
  }

  loadGradeDetails(): void {
    if (!this.selectedGradeId) return;

    this.teacherService.getGradesByCourse(this.courseId).subscribe({
      next: (grades: any[]) => {
        const currentGrade = grades.find(g => g.id === this.selectedGradeId);
        if (currentGrade) {
          this.gradeName = currentGrade.name || 'Grade';
          this.gradeDescription = currentGrade.description || '';
        }
      },
      error: (err: unknown) => {
        console.error('Error loading grade details:', err);
      }
    });
  }

  loadAssignedSubjects(): void {
    if (!this.selectedGradeId) return;
    this.isLoading = true;
    const storedIcons: Record<string, string> = JSON.parse(localGet('subjectIcons') || '{}');

    this.teacherService.getGradeSubjectsByGrade(this.selectedGradeId).subscribe({
      next: (subjectRows: any[]) => {
        this.subjects = subjectRows.map(gs => {
          const subjectId = gs.subjectId || gs.subject?.id || gs.id;
          const matched = this.availableSubjects.find(s => s.id === subjectId);
          const name = matched?.name || gs.subjectName || gs.subject?.name || gs.subject || 'Subject';
          const description = matched?.description || gs.description || 'No description';
          const iconName = matched?.iconName || gs.iconName || storedIcons[subjectId] || storedIcons[name.toLowerCase().trim()] || '';

          return {
            id: gs.id,
            subjectId,
            gradeSubjectId: gs.gradeSubjectId || gs.id,
            name,
            iconName,
            description,
            stats: [
              { label: 'topics', value: `${gs.topicCount || 0} topics`, color: 'blue' as const },
              { label: 'subtopics', value: '...', color: 'green' as const }
            ]
          };
        });

        this.isLoading = false;
        this.subjects.forEach((subject, index) => {
          this.teacherService.getTopicsByGradeSubject(subject.gradeSubjectId).subscribe({
            next: (topics) => {
              if (!topics || topics.length === 0) {
                this.subjects[index].stats[1].value = '0 subtopics';
                return;
              }
              const subtopicRequests = topics.map(t => 
                this.teacherService.getSubTopicsByTopic(t.id).pipe(catchError(() => of([])))
              );
              forkJoin(subtopicRequests).subscribe({
                next: (results) => {
                  const totalSubtopics = results.reduce((sum, arr) => sum + arr.length, 0);
                  this.subjects[index].stats[1].value = `${totalSubtopics} subtopics`;
                },
                error: () => {
                  this.subjects[index].stats[1].value = '0 subtopics';
                }
              });
            },
            error: () => {
              this.subjects[index].stats[1].value = '0 subtopics';
            }
          });
        });
      },
      error: (err: unknown) => {
        console.error('Error loading assigned subjects:', err);
        this.isLoading = false;
        this.toast.show('Couldn\'t load assigned subjects. Please try again.', 'error');
      }
    });
  }

  updateUrlWithGradeId(): void {
    if (this.selectedGradeId && typeof window !== 'undefined') {
      this.router.navigate(['/courses/grade', this.selectedGradeId], { replaceUrl: true });
    }
  }

  loadSubjectsOnly(): void {
    if (!this.courseId) return;

    this.teacherService.getSubjectsByCourse(this.courseId).subscribe({
      next: (subjects: any[]) => {
        this.availableSubjects = subjects;
        console.log('availableSubjects from API:', subjects.map(s => ({
          name: s.name,
          iconName: s.iconName ?? ''
        })));

        // ✅ Use localGet and localSet
        const existing = JSON.parse(localGet('subjectIcons') || '{}');
        subjects.forEach(s => {
          if (s.iconName) {
            existing[s.id] = s.iconName;
            existing[s.name.toLowerCase().trim()] = s.iconName;
          }
        });
        localSet('subjectIcons', JSON.stringify(existing));

        this.loadAssignedSubjects();
      },
      error: (err: unknown) => {
        console.error('Error loading subjects:', err);
        this.availableSubjects = [];
        this.toast.show('Couldn\'t load available subjects. Please try again.', 'error');
      }
    });
  }

  assignSubject() {
    if (!this.selectedSubjectId) {
      this.toast.show('Please select a subject.', 'warning');
      return;
    }
    if (!this.selectedGradeId) {
      this.toast.show('Grade ID not found. Please refresh the page.', 'error');
      return;
    }

    const gradeSubjectData = {
      gradeId: this.selectedGradeId,
      subjectId: this.selectedSubjectId
    };

    console.log('Assigning subject - gradeId:', this.selectedGradeId, 'subjectId:', this.selectedSubjectId);

    this.teacherService.createGradeSubject(gradeSubjectData).subscribe({
      next: (response: any) => {
        const gradeSubjectId = response.generatedId;
        console.log('Grade-subject created with ID:', gradeSubjectId);

        // ✅ Use localSet
        this.gradeSubjectId = gradeSubjectId;
        localSet('selectedGradeSubjectId', gradeSubjectId);

        const subject = this.availableSubjects.find(s => s.id === this.selectedSubjectId);
        if (subject) {
          const newSubject: SubjectCard = {
            id: gradeSubjectId,
            subjectId: subject.id,
            gradeSubjectId: gradeSubjectId,
            name: subject.name,
            iconName: subject.iconName || '',
            description: subject.description || 'Assigned subject',
            stats: [
              { label: 'topics', value: '0 topics', color: 'blue' },
              { label: 'subtopics', value: '0 subtopics', color: 'green' }
            ]
          };
          this.subjects.push(newSubject);
          this.loadAssignedSubjects();
        }
        this.toggleForm();
        this.toast.show('Subject assigned successfully!', 'success');
      },
      error: (err: unknown) => {
        console.error('Error assigning subject:', err);
        if ((err as any).status === 409) {
          this.toast.show('This subject is already assigned to this grade.', 'warning');
        } else {
          this.toast.show('Couldn\'t assign subject. Please try again.', 'error');
        }
      }
    });
  }

  navigateToSubject(subject: SubjectCard) {
    const gradeSubjectId = subject.gradeSubjectId;
    localSet('selectedGradeSubjectId', gradeSubjectId);
    localSet('selectedSubjectName', subject.name);

    console.log('Navigating with gradeSubjectId:', gradeSubjectId);
    this.router.navigate(['/courses/topics', gradeSubjectId]);
  }

  createTopic() {
    const topicData = {
      name: this.topicForm.value.name,
      description: this.topicForm.value.description,
      active: true,
      gradeSubjectId: this.gradeSubjectId
    };

    this.teacherService.createTopic(topicData).subscribe({
      next: (response) => {
        const topicId = response.id;
        console.log('Topic created:', topicId);
        this.router.navigate(['/teacher/subtopics', topicId]);
      },
      error: (err: unknown) => console.error('Error creating topic:', err)
    });
  }

  goBackToGradeStructure() {
    const courseId = localGet('selectedCourseId') || '';
    this.router.navigate(['/courses/content', courseId]);
  }
}