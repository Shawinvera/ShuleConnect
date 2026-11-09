import { Injectable } from '@angular/core';

export interface LearnerData {
  id?: string;
  gender: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AvatarUtilService {
  private readonly boyAvatarsPath = 'assets/learner_icons/boy/';
  private readonly girlAvatarsPath = 'assets/learner_icons/girl/';
  private readonly fallbackPath = 'assets/learner_icons/';

  constructor() {}

  /**
   * Get the correct avatar path for a learner based on their gender
   * @param learner - Learner object with gender and avatar properties
   * @returns string - Full path to the avatar image
   */
  getLearnerAvatarPath(learner: LearnerData | any): string {
    if (!learner) {
      return this.getDefaultAvatarPath('MALE');
    }

    const avatar = learner.avatar;
    let gender = learner.gender;

    // If no gender provided, try to infer from avatar filename
    if (!gender && avatar) {
      gender = this.inferGenderFromFilename(avatar) || 'MALE';
    }

    if (!avatar) {
      return this.getDefaultAvatarPath(gender || 'MALE');
    }

    // If avatar already contains full path, return as is
    if (avatar.includes('assets/') || avatar.startsWith('http')) {
      return avatar;
    }

    // Determine the correct path based on gender
    const basePath = this.getBasePath(gender || 'MALE');
    return basePath + avatar;
  }

  /**
   * Get avatar path by filename and gender
   * @param filename - Avatar filename
   * @param gender - 'MALE' or 'FEMALE'
   * @returns string - Full path to the avatar image
   */
  getAvatarPathByGender(filename: string, gender: string): string {
    if (!filename) {
      return this.getDefaultAvatarPath(gender);
    }

    const basePath = this.getBasePath(gender);
    return basePath + filename;
  }

  /**
   * Get the base path for avatars based on gender
   * @param gender - 'MALE' or 'FEMALE'
   * @returns string - Base path for the gender
   */
  private getBasePath(gender: string): string {
    if (gender === 'MALE') {
      return this.boyAvatarsPath;
    } else if (gender === 'FEMALE') {
      return this.girlAvatarsPath;
    }
    
    // Fallback to boy path for unknown genders
    return this.boyAvatarsPath;
  }

  /**
   * Get default avatar path for a gender
   * @param gender - 'MALE' or 'FEMALE'
   * @returns string - Path to default avatar
   */
  private getDefaultAvatarPath(gender: string): string {
    if (gender === 'FEMALE') {
      return this.girlAvatarsPath + 'brown_girl.png';
    }
    return this.boyAvatarsPath + 'brown_boy.png';
  }

  /**
   * Legacy method for backward compatibility
   * Tries to resolve avatar path with fallback to old structure
   * @param filename - Avatar filename
   * @param gender - Optional gender for better path resolution
   * @returns string - Avatar path
   */
  getLegacyAvatarPath(filename: string, gender?: string): string {
    if (!filename) {
      return this.getDefaultAvatarPath(gender || 'MALE');
    }

    // If filename already contains path, return as is
    if (filename.includes('assets/') || filename.startsWith('http')) {
      return filename;
    }

    // Try gender-based path first if gender is provided
    if (gender) {
      return this.getAvatarPathByGender(filename, gender);
    }

    // Fallback to old structure for backward compatibility
    return this.fallbackPath + filename;
  }

  /**
   * Check if an avatar filename suggests a specific gender
   * @param filename - Avatar filename
   * @returns 'MALE' | 'FEMALE' | null
   */
  inferGenderFromFilename(filename: string): 'MALE' | 'FEMALE' | null {
    if (!filename) return null;
    
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.includes('girl') || lowerFilename.includes('female')) {
      return 'FEMALE';
    }
    
    if (lowerFilename.includes('boy') || lowerFilename.includes('male')) {
      return 'MALE';
    }
    
    return null;
  }

  /**
   * Validate if an avatar path exists (for future use)
   * @param path - Avatar path to validate
   * @returns boolean - Whether the path is valid
   */
  isValidAvatarPath(path: string): boolean {
    return !!(path && (
      path.includes('assets/learner_icons/') || 
      path.startsWith('http') || 
      path.startsWith('data:')
    ));
  }
}