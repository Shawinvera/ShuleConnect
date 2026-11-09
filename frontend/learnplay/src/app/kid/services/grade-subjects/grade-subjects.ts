import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

// This matches your GradeSubjectDetailsDto
export interface GradeSubjectDetails {
  id: string; // Subject ID (from your Repo Query)
  gradeSubjectId: string;
  subject: string; // Subject Name
  name: string;
  description: string;
  topicCount: number;

  // UI ONLY FIELDS (Not in DB)
  icon: string;
  bg: string;
  color: string;
  gradient: string;
  progress: number;
  points: number;

  bgColor: string;   
  textColor: string; 
}

@Injectable({ providedIn: 'root' })
export class GradeSubjectService {
  private readonly endpoint = `${environment.apiUrl}/grade-subject`;

  constructor(private http: HttpClient) {}

  public getSubjectsByGrade(gradeId: string): Observable<GradeSubjectDetails[]> {
    return this.http
      .get<any[]>(`${this.endpoint}/subjects/byGrade/${gradeId}`)
      .pipe(map((data) => data.map((s) => this.applyUiStyles(s))));
  }

  private applyUiStyles(data: any): GradeSubjectDetails {

    // 1. Construct the icon path using the filename from backend
    // Assumes your icons are in src/assets/subject-icons/
    const iconPath = `/assets/subject-icons/${data.subjectIconName || 'maths.png'}`;

    // 2. Use the HEX color from backend, or a fallback if null
    const baseColor = data.subjectColour || '#9333EA';

    return {
      ...data,
      name: data.subject,
      progress: 0,
      points: data.topicCount,
      gradeSubjectId: data.gradeSubjectId,

      // Dynamic Properties
      icon: iconPath,
      bgColor: baseColor, // We'll use this for [style.backgroundColor]
      
      // We can generate a dynamic gradient using the HEX color
      gradient: `linear-gradient(135deg, ${baseColor} 15.3%, #ffffff 150%)`,

      // Use the hex color for the text as well
      textColor: baseColor,
      bg: baseColor, 
      color: ''
    };
  }
}
