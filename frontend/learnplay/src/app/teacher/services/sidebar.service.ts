import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private sidebarExpanded$ = new BehaviorSubject<boolean>(false);

  getSidebarState() {
    return this.sidebarExpanded$.asObservable();
  }

  setSidebarState(expanded: boolean) {
    this.sidebarExpanded$.next(expanded);
  }

  toggleSidebar() {
    this.sidebarExpanded$.next(!this.sidebarExpanded$.value);
  }

  getCurrentState(): boolean {
    return this.sidebarExpanded$.value;
  }
}