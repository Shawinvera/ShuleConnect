import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ParentModalService {
  private editProfileSubject = new Subject<void>();
  private editPhoneSubject = new Subject<void>();
  private changePasswordSubject = new Subject<void>();

  editProfile$ = this.editProfileSubject.asObservable();
  editPhone$ = this.editPhoneSubject.asObservable();
  changePassword$ = this.changePasswordSubject.asObservable();

  openEditProfile() {
    this.editProfileSubject.next();
  }

  openEditPhone() {
    this.editPhoneSubject.next();
  }

  openChangePassword() {
    this.changePasswordSubject.next();
  }
}