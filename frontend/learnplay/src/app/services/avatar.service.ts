import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

export interface AvatarInfo {
  filename: string;
  path: string;
}

@Injectable({
  providedIn: 'root'
})
export class AvatarService {
  private readonly boyAvatarsPath = 'assets/learner_icons/boy/';
  private readonly girlAvatarsPath = 'assets/learner_icons/girl/';

  // Extended avatar lists - add new avatars here and they'll be automatically included
  private readonly boyAvatarsList = [
    'brown_boy.png',
    'dark_brown_boy.png', 
    'light_boy.png',
    'pale_boy.png',
    'short_hair_glasses_boy.png',
    'short_hair_glasses_brown_boy.png',
    'short_hair_glasses_pale_boy.png',
    'short_hair_no_glasses_boy.png',
    'short_hair_no_glasses_brown_boy.png',
    'short_hair_no_glasses_pale_boy.png',
    'short_hair_shades_pale_boy.png',
    'study_glasses_boy.png',
    'sun_glasses_boy.png',
    'brown_bald_hoodie_boy.png',
    'brown_bald_hoodie_glasses_boy.png',
    'brown_bald_shirt_boy.png',
    'brown_bald_shirt_glasses_boy.png',
    'brown_glasses_hoodie_boy.png',
    'brown_shades_hoodie_boy.png',
    'darkbrown_bald_hoodie_boy.png',
    'darkbrown_bald_hoodie_glasses_boy.png',
    'darkbrown_bald_shirt_boy.png',
    'darkbrown_bald_shirt_glasses_boy.png',
    'light_bald_hoodie_boy.png',
    'light_bald_hoodie_glasses_boy.png',
    'light_bald_shirt_boy.png',
    'light_bald_shirt_glasses_boy.png',
    'light_glasses_hoodie_boy.png',
    'light_shades_hoodie_boy.png',
    'short_hair_hoodie_glasses_brown_boy.png',
    'short_hair_hoodie_glasses_darkbrown_boy.png',
    'short_hair_hoodie_glasses_light_boy.png',
    'short_hair_hoodie_shades_brown_boy.png',
    'short_hair_hoodie_shades_darkbrown_boy.png',
    'short_hair_hoodie_shades_light_boy.png',
    'short_hair_shades_brown_boy.png'
  ];

  private readonly girlAvatarsList = [
    'brown_girl.png',
    'dark_brown_girl.png',
    'light_girl.png', 
    'pale_girl.png',
    'brown_hijab_girl.png',
    'brown_hijab_glasses_girl.png',
    'brown_hoodie_bun_girl.png',
    'brown_hoodie_bun_glasses_girl.png',
    'brown_hoodie_bun_shades_girl.png',
    'brown_longhair_hoodie_glasses_girl.png',
    'brown_longhair_hoodie_shades_girl.png',
    'brown_longhair_vneck_girl.png',
    'brown_longhair_vneck_glasses_girl.png',
    'brown_longhair_vneck_shades_girl.png',
    'brown_vneck_bun_girl.png',
    'brown_vneck_bun_glasses_girl.png',
    'brown_vneck_bun_shades_girl.png',
    'darkbrown_hijab_girl.png',
    'darkbrown_hijab_glasses_girl.png',
    'darkbrown_hoodie_bun_girl.png',
    'darkbrown_hoodie_bun_glasses_girl.png',
    'darkbrown_hoodie_bun_shades_girl.png',
    'darkbrown_longhair_hoodie_glasses_girl.png',
    'darkbrown_longhair_hoodie_shades_girl.png',
    'darkbrown_longhair_vneck_girl.png',
    'darkbrown_longhair_vneck_glasses_girl.png',
    'darkbrown_longhair_vneck_shades_girl.png',
    'darkbrown_vneck_bun_girl.png',
    'darkbrown_vneck_bun_glasses_girl.png',
    'darkbrown_vneck_bun_shades_girl.png',
    'light_hijab_girl.png',
    'light_hijab_glasses_girl.png',
    'light_hoodie_bun_girl.png',
    'light_hoodie_bun_glasses_girl.png',
    'light_hoodie_bun_shades_girl.png',
    'light_longhair_hoodie_glasses_girl.png',
    'light_longhair_hoodie_shades_girl.png',
    'light_longhair_vneck_girl.png',
    'light_longhair_vneck_glasses_girl.png',
    'light_longhair_vneck_shades_girl.png',
    'light_vneck_bun_girl.png',
    'light_vneck_bun_glasses_girl.png',
    'light_vneck_bun_shades_girl.png'
  ];

  constructor(private http: HttpClient) {}

  /**
   * Get avatars for the specified gender with dynamic detection
   * @param gender - 'MALE' or 'FEMALE'
   * @returns Observable<AvatarInfo[]>
   */
  getAvatarsByGender(gender: 'MALE' | 'FEMALE'): Observable<AvatarInfo[]> {
    const isMale = gender === 'MALE';
    const basePath = isMale ? this.boyAvatarsPath : this.girlAvatarsPath;
    const avatarList = isMale ? this.boyAvatarsList : this.girlAvatarsList;

    // Check if we're in a Capacitor environment (mobile app)
    const isCapacitor = (window as any)?.Capacitor?.isNativePlatform?.() || 
                       window.location.protocol === 'capacitor:';

    if (isCapacitor) {
      // In mobile app, skip HTTP checks and return all known avatars
      console.log('Mobile environment detected, using static avatar list');
      return of(avatarList.map(filename => ({
        filename,
        path: basePath + filename
      })));
    } else {
      // In web environment, use dynamic detection
      return this.detectAvailableAvatars(basePath, avatarList);
    }
  }

  /**
   * Detect available avatars by checking if files exist
   * @param basePath - Base path to avatar directory
   * @param knownAvatars - List of known avatar filenames
   * @returns Observable<AvatarInfo[]>
   */
  private detectAvailableAvatars(basePath: string, knownAvatars: string[]): Observable<AvatarInfo[]> {
    // Check which avatars actually exist
    const avatarChecks = knownAvatars.map(filename => 
      this.checkAvatarExists(basePath + filename).pipe(
        map(exists => exists ? { filename, path: basePath + filename } : null)
      )
    );

    return forkJoin(avatarChecks).pipe(
      map(results => results.filter(avatar => avatar !== null) as AvatarInfo[]),
      catchError(() => {
        // Fallback: return all known avatars without checking
        console.warn('Avatar detection failed, using fallback list');
        return of(knownAvatars.map(filename => ({
          filename,
          path: basePath + filename
        })));
      })
    );
  }

  /**
   * Check if an avatar file exists
   * @param avatarPath - Full path to avatar
   * @returns Observable<boolean>
   */
  private checkAvatarExists(avatarPath: string): Observable<boolean> {
    // Skip HTTP HEAD requests for asset files in interceptors
    const headRequest = this.http.head(avatarPath, { 
      observe: 'response',
      headers: { 'X-Skip-Interceptor': 'true' }
    });
    
    return headRequest.pipe(
      map(response => response.status === 200),
      catchError((error) => {
        console.warn(`Avatar check failed for ${avatarPath}:`, error);
        return of(false);
      })
    );
  }

  /**
   * Get the full path for an avatar filename based on gender
   * @param filename - Avatar filename
   * @param gender - 'MALE' or 'FEMALE'
   * @returns string - Full path to avatar
   */
  getAvatarPath(filename: string, gender: 'MALE' | 'FEMALE'): string {
    const basePath = gender === 'MALE' ? this.boyAvatarsPath : this.girlAvatarsPath;
    return basePath + filename;
  }

  /**
   * Add new avatars to the detection list (for future extensibility)
   * @param gender - 'MALE' or 'FEMALE'
   * @param filenames - Array of new avatar filenames to add
   */
  addAvatarsToList(gender: 'MALE' | 'FEMALE', filenames: string[]): void {
    if (gender === 'MALE') {
      this.boyAvatarsList.push(...filenames);
    } else {
      this.girlAvatarsList.push(...filenames);
    }
  }
}