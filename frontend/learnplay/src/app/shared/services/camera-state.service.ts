import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CameraStateService {
  private cameraOpenSubject = new BehaviorSubject<boolean>(false);
  public cameraOpen$ = this.cameraOpenSubject.asObservable();

  setCameraOpen(isOpen: boolean) {
    this.cameraOpenSubject.next(isOpen);
  }

  isCameraOpen(): boolean {
    return this.cameraOpenSubject.value;
  }
}