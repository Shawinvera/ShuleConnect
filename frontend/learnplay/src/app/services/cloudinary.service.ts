import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  asset_id: string;
}

@Injectable({ providedIn: 'root' })
export class CloudinaryService {
  private readonly uploadUrl = 'https://api.cloudinary.com/v1_1/datki5f71/image/upload';
  private readonly uploadPreset = 'wazi-profiles';

  constructor(private http: HttpClient) {}

  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    return this.http
      .post<CloudinaryUploadResponse>(this.uploadUrl, formData)
      .pipe(map((res) => res.secure_url));
  }

  /**
   * Compress and resize image using Canvas before upload.
   * Targets ~80% quality JPEG, max 800px on longest side.
   */
  compressImage(file: File, maxDimension = 800, quality = 0.82): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Compression failed'));
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality,
        );
      };
      img.onerror = reject;
      img.src = url;
    });
  }
}
