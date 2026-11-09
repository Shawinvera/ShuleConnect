import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  private apiUrl = environment.apiUrl;
  public http: HttpClient;

  constructor(private httpClient: HttpClient) {
    this.http = httpClient;
  }

  // Course Management
  createCourse(courseData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/courses`, courseData);
  }

  getCourses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/courses/all`);
  }

  // Grade Management
  createGrade(gradeData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/grade`, gradeData);
  }

  getGrades(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/grade/all`);
  }

  getGradesByCourse(courseId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/grade/fetchByCourse/${courseId}`);
  }

  updateGrade(gradeId: string, gradeData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/grade/update`, { ...gradeData, id: gradeId });
  }

  deleteGrade(gradeId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/grade/${gradeId}`);
  }

  // Topic Management
  createTopic(topicData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/topic`, topicData);
  }

  updateTopic(topicId: string, topicData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/topic/update`, { ...topicData, id: topicId });
  }

  deleteTopic(topicId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/topic/${topicId}`);
  }

  // Sub-Topic Management
  createSubTopic(subTopicData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sub-topic`, subTopicData);
  }

  updateSubTopic(subTopicId: string, subTopicData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/sub-topic/update`, { ...subTopicData, id: subTopicId });
  }

  deleteSubTopic(subTopicId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sub-topic/${subTopicId}`);
  }

  // Lesson Management
  createLesson(lessonData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/lesson`, lessonData);
  }

  getLessons(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/lessons`);
  }

  updateLesson(id: number, lessonData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/lessons/${id}`, lessonData);
  }

  deleteLesson(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/lessons/${id}`);
  }

  // Subject Management
  createSubject(subjectData: any): Observable<any> {
    console.log('Creating subject with data:', subjectData);
    console.log('courseId:', subjectData.courseId);
    return this.http.post(`${this.apiUrl}/subject`, subjectData);
  }

  updateSubject(subjectData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/subject/update`, subjectData);
  }

  getSubjects(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/subject/all`);
  }

  // Grade-Subject Association
  createGradeSubject(gradeSubjectData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/grade-subject`, gradeSubjectData);
  }

  // Get subjects by grade
  getSubjectsByGrade(gradeId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/grade-subject/subjects/byGrade/${gradeId}`);
  }

  // Get all subjects from backend
  getAllSubjects(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/subjects/all`);
  }

  // Get subjects by course
  getSubjectsByCourse(courseId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/subject/fetchByCourse/${courseId}`);
  }

  // Get all grade-subject associations
  getGradeSubjects(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/grade-subject/all`);
  }

  // Get grade-subjects by grade ID with correct IDs
  getGradeSubjectsWithIds(gradeId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/grade-subject/subjects/byGrade/${gradeId}`);
  }

  // Get grade-subjects by grade ID
  getGradeSubjectsByGrade(gradeId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/grade-subject/subjects/byGrade/${gradeId}`);
  }

  // Get raw grade subjects (returns actual grade subject IDs)
  getRawGradeSubjects(gradeId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/grade-subject/subjects/byGrade/${gradeId}`);
  }

  // Get topics by grade-subject ID
  getTopicsByGradeSubject(gradeSubjectId: string): Observable<any[]> {
    console.log('API call: getTopicsByGradeSubject with ID:', gradeSubjectId);
    const url = `${this.apiUrl}/grade-subject/topics/bySubject/${gradeSubjectId}`;
    console.log('Full API URL:', url);
    return this.http.get<any[]>(url);
  }

  // Get subtopics by topic ID
  getSubTopicsByTopic(topicId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sub-topic/fetch/byTopicId/${topicId}`);
  }

  // Get lessons by subtopic ID
  getLessonsBySubTopic(subTopicId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/lesson/fetch/bySubTopicId/${subTopicId}`);
  }

  // Get existing IDs from database
  getExistingIds(): Observable<any> {
    return new Observable(observer => {
      this.getCourses().subscribe({
        next: (courses: any) => {
          if (courses.length > 0) {
            const courseId = courses[0].id;
            this.getGradesByCourse(courseId).subscribe({
              next: (grades: any) => {
                console.log('Grades found:', grades);
                const grade1 = grades.find((g: any) => g.name === 'Grade 1' || g.name === 'GRADE 1');
                if (grade1) {
                  this.getSubjectsByCourse(courseId).subscribe({
                    next: (subjects: any) => {
                      console.log('Subjects found:', subjects);
                      const mathSubject = subjects.find((s: any) => s.name === 'Mathematics');
                      if (mathSubject) {
                        this.getGradeSubjects().subscribe({
                          next: gradeSubjects => {
                            const gradeSubject = gradeSubjects.find((gs: any) =>
                              gs.gradeId === grade1.id && gs.subjectId === mathSubject.id
                            );
                            if (gradeSubject) {
                              observer.next({ courseId, gradeId: grade1.id, subjectId: mathSubject.id, gradeSubjectId: gradeSubject.id });
                              observer.complete();
                            } else {
                              observer.error('Grade-subject association not found');
                            }
                          },
                          error: () => {
                            observer.error('Grade-subject association not found');
                          }
                        });
                      } else {
                        observer.error('Mathematics subject not found');
                      }
                    },
                    error: () => observer.error('Error loading subjects')
                  });
                } else {
                  observer.error('Grade 1 not found');
                }
              },
              error: () => observer.error('Error loading grades')
            });
          } else {
            observer.error('No courses found');
          }
        },
        error: () => observer.error('Error loading courses')
      });
    });
  }
}