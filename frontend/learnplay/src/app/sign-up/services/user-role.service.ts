import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserRoleService {
  private selectedRole: 'kid' | 'parent' | 'teacher' | null = null;

  setRole(role: 'kid' | 'parent' | 'teacher') {
    this.selectedRole = role;
  }

  getRole(): 'kid' | 'parent' | 'teacher' | null {
    return this.selectedRole;
  }

  clearRole() {
    this.selectedRole = null;
  }

  getRedirectPath(): string {
    switch (this.selectedRole) {
      case 'kid':
        return '/kid';
      case 'parent':
        return '/parent';
      case 'teacher':
        return '/teacher';
      default:
        return '/';
    }
  }
}
