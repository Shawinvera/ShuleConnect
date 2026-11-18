# Implementation Plan — Teacher & School Coordination SMS (Staff Notifications)

Explored files: AppUserRepo.java, AppUser.java, ATService.java, AirtimeController.java,
LessonController.java, UserController.java, AirtimeService.java, CustomResponse.java,
AppUserDto.java, BaseDto.java, ATSmsRequestDto.java, SecurityConfig.java,
teacher-routing-module.ts, sidebar.html/.ts/.css, notification.component.ts,
teacher.service.ts, notification.service.ts, environment.ts.

**Key decisions grounded in the codebase:**
- Reuse `ATService.sendBulkSms(List<String>, String)` (already exists) for multi-recipient SMS; `ATService.sendSms(String, String)` for individual. No new SMS wiring needed.
- Return counts (int) from service methods so the controller can echo "N teacher(s) notified" — matches the data-first CustomResponse pattern.
- `StaffNotificationDto` is a plain `@Data` class (no BaseDto), matching ATSmsRequestDto pattern.
- Use `AppUserDto` as the response type for GET /staff/teachers and /staff/admins — it already has all the needed fields.
- The existing `notification.component.ts` is a toast popup. The new page component is a **different class** (`StaffNotificationsComponent`, selector `app-staff-notifications`) written into the same file; the toast class is replaced entirely since nothing imports it by class name from outside — `NotificationService` (the BehaviorSubject service) is unaffected.
- All `/staff/**` routes are automatically JWT-protected because SecurityConfig applies `.anyRequest().authenticated()`. No extra `@PreAuthorize` needed.
- Route is `/courses/notifications` (child of TeacherLayout guard), consistent with `/courses/analytics`.
- Sidebar bell button goes after the `*ngIf="currentPage === 'dashboard'"` `</ng-container>` block, before `</nav>`, so it appears on every page (like the Home button).

---

## FEAT-001 — Backend

- [ ] 1. Add `findActiveUsersByRole` query to `AppUserRepo`.
      Add one `@Query` method that selects active, phone-having users by role string.
      Files: `backend/src/main/java/com/softkit/wazi/repository/AppUserRepo.java`
      Verify: `cd backend && mvn compile` — BUILD SUCCESS.

      Exact addition (inside the interface body after the last method):
      ```java
      @Query("SELECT u FROM AppUser u WHERE u.role = :role AND u.phoneNumber IS NOT NULL AND u.activated = true")
      List<AppUser> findActiveUsersByRole(@Param("role") String role);
      ```
      `@Param` is already imported via `org.springframework.data.repository.query.Param` — verify before adding a duplicate import.

- [ ] 2. Create `StaffNotificationDto` model class.
      Plain Lombok `@Data` DTO with three fields: `message`, `subject`, `phoneNumber`.
      Files: `backend/src/main/java/com/softkit/wazi/model/StaffNotificationDto.java`
      Verify: `mvn compile` — BUILD SUCCESS.

      ```java
      package com.softkit.wazi.model;

      import lombok.AllArgsConstructor;
      import lombok.Data;
      import lombok.NoArgsConstructor;

      @Data
      @AllArgsConstructor
      @NoArgsConstructor
      public class StaffNotificationDto {
          private String message;
          private String subject;
          private String phoneNumber;
      }
      ```

- [ ] 3. Create `StaffNotificationService`.
      Injects `AppUserRepo` and `ATService`. Methods: `notifyAllTeachers`, `notifyAllAdmins`,
      `notifyAllStaff`, `notifyIndividual` (all return int count or void), plus `getTeachers`
      and `getAdmins` returning `List<AppUserDto>`. SMS prefix: `"ShuleConnect Staff Alert: "`.
      Uses `atService.sendBulkSms(phones, msg)` for bulk and `atService.sendSms(phone, msg)` for single.
      Files: `backend/src/main/java/com/softkit/wazi/service/StaffNotificationService.java`
      Verify: `mvn compile` — BUILD SUCCESS.

      ```java
      package com.softkit.wazi.service;

      import com.softkit.wazi.entities.AppUser;
      import com.softkit.wazi.model.AppUserDto;
      import com.softkit.wazi.repository.AppUserRepo;
      import jakarta.mail.MessagingException;
      import lombok.RequiredArgsConstructor;
      import lombok.extern.slf4j.Slf4j;
      import org.springframework.stereotype.Service;

      import java.util.List;
      import java.util.stream.Collectors;

      @Service
      @RequiredArgsConstructor
      @Slf4j
      public class StaffNotificationService {

          private final AppUserRepo appUserRepo;
          private final ATService atService;

          private static final String PREFIX = "ShuleConnect Staff Alert: ";

          public int notifyAllTeachers(String message) throws MessagingException {
              List<AppUser> teachers = appUserRepo.findActiveUsersByRole("TEACHER");
              List<String> phones = teachers.stream()
                      .map(AppUser::getPhoneNumber)
                      .collect(Collectors.toList());
              if (!phones.isEmpty()) {
                  atService.sendBulkSms(phones, PREFIX + message);
              }
              log.info("Notified {} teacher(s) via SMS", phones.size());
              return phones.size();
          }

          public int notifyAllAdmins(String message) throws MessagingException {
              List<AppUser> admins = appUserRepo.findActiveUsersByRole("ADMIN");
              List<String> phones = admins.stream()
                      .map(AppUser::getPhoneNumber)
                      .collect(Collectors.toList());
              if (!phones.isEmpty()) {
                  atService.sendBulkSms(phones, PREFIX + message);
              }
              log.info("Notified {} admin(s) via SMS", phones.size());
              return phones.size();
          }

          public int notifyAllStaff(String message) throws MessagingException {
              int t = notifyAllTeachers(message);
              int a = notifyAllAdmins(message);
              log.info("Notified {} staff member(s) total via SMS", t + a);
              return t + a;
          }

          public void notifyIndividual(String phoneNumber, String message) throws MessagingException {
              atService.sendSms(phoneNumber, PREFIX + message);
              log.info("Sent individual staff notification to {}", phoneNumber);
          }

          public List<AppUserDto> getTeachers() {
              return appUserRepo.findActiveUsersByRole("TEACHER")
                      .stream().map(this::toDto).collect(Collectors.toList());
          }

          public List<AppUserDto> getAdmins() {
              return appUserRepo.findActiveUsersByRole("ADMIN")
                      .stream().map(this::toDto).collect(Collectors.toList());
          }

          private AppUserDto toDto(AppUser user) {
              AppUserDto dto = new AppUserDto();
              dto.setId(user.getId());
              dto.setFirstName(user.getFirstName());
              dto.setLastName(user.getLastName());
              dto.setUsername(user.getUsername());
              dto.setPhoneNumber(user.getPhoneNumber());
              dto.setRole(user.getRole());
              dto.setCountryCode(user.getCountryCode());
              return dto;
          }
      }
      ```

- [ ] 4. Create `StaffNotificationController`.
      Six endpoints under `/staff`: POST notify/teachers, POST notify/admins, POST notify/all,
      POST notify/individual, GET teachers, GET admins. Returns `CustomResponse` for POSTs,
      `List<AppUserDto>` for GETs.
      Files: `backend/src/main/java/com/softkit/wazi/controller/StaffNotificationController.java`
      Verify: `mvn compile` — BUILD SUCCESS. Then with the backend running and a valid auth cookie:
      `curl -s -X GET http://localhost:8112/api/staff/teachers --cookie "<token>"` returns HTTP 200.

      ```java
      package com.softkit.wazi.controller;

      import com.softkit.wazi.model.AppUserDto;
      import com.softkit.wazi.model.CustomResponse;
      import com.softkit.wazi.model.StaffNotificationDto;
      import com.softkit.wazi.service.StaffNotificationService;
      import jakarta.mail.MessagingException;
      import lombok.RequiredArgsConstructor;
      import org.springframework.http.ResponseEntity;
      import org.springframework.web.bind.annotation.*;

      import java.util.List;

      @RestController
      @RequestMapping("/staff")
      @RequiredArgsConstructor
      public class StaffNotificationController {

          private final StaffNotificationService staffNotificationService;

          @PostMapping("/notify/teachers")
          public ResponseEntity<CustomResponse> notifyTeachers(@RequestBody StaffNotificationDto dto) throws MessagingException {
              int count = staffNotificationService.notifyAllTeachers(dto.getMessage());
              return ResponseEntity.ok(CustomResponse.builder()
                      .successful(true).data(count + " teacher(s) notified").build());
          }

          @PostMapping("/notify/admins")
          public ResponseEntity<CustomResponse> notifyAdmins(@RequestBody StaffNotificationDto dto) throws MessagingException {
              int count = staffNotificationService.notifyAllAdmins(dto.getMessage());
              return ResponseEntity.ok(CustomResponse.builder()
                      .successful(true).data(count + " admin(s) notified").build());
          }

          @PostMapping("/notify/all")
          public ResponseEntity<CustomResponse> notifyAll(@RequestBody StaffNotificationDto dto) throws MessagingException {
              int count = staffNotificationService.notifyAllStaff(dto.getMessage());
              return ResponseEntity.ok(CustomResponse.builder()
                      .successful(true).data(count + " staff member(s) notified").build());
          }

          @PostMapping("/notify/individual")
          public ResponseEntity<CustomResponse> notifyIndividual(@RequestBody StaffNotificationDto dto) throws MessagingException {
              staffNotificationService.notifyIndividual(dto.getPhoneNumber(), dto.getMessage());
              return ResponseEntity.ok(CustomResponse.builder()
                      .successful(true).data("Message sent to " + dto.getPhoneNumber()).build());
          }

          @GetMapping("/teachers")
          public ResponseEntity<List<AppUserDto>> getTeachers() {
              return ResponseEntity.ok(staffNotificationService.getTeachers());
          }

          @GetMapping("/admins")
          public ResponseEntity<List<AppUserDto>> getAdmins() {
              return ResponseEntity.ok(staffNotificationService.getAdmins());
          }
      }
      ```

---

## FEAT-002 — Frontend

- [ ] 5. Create `StaffNotificationService` (Angular HTTP service).
      Wraps the six backend endpoints. Uses `environment.apiUrl` and `withCredentials: true`.
      Files: `frontend/learnplay/src/app/teacher/services/staff-notification.service.ts`
      Verify: `ng build` — no TypeScript errors.

      ```typescript
      import { Injectable } from '@angular/core';
      import { HttpClient } from '@angular/common/http';
      import { Observable } from 'rxjs';
      import { environment } from '../../../environments/environment';

      export interface StaffUser {
        id: string; firstName: string; lastName: string;
        username: string; phoneNumber: string; role: string; countryCode: string;
      }

      export interface NotifyRequest {
        message: string; subject?: string; phoneNumber?: string;
      }

      export interface NotifyResponse {
        successful: boolean; data: string;
      }

      @Injectable({ providedIn: 'root' })
      export class StaffNotificationService {
        private base = environment.apiUrl;
        constructor(private http: HttpClient) {}

        notifyTeachers(req: NotifyRequest): Observable<NotifyResponse> {
          return this.http.post<NotifyResponse>(`${this.base}/staff/notify/teachers`, req, { withCredentials: true });
        }
        notifyAdmins(req: NotifyRequest): Observable<NotifyResponse> {
          return this.http.post<NotifyResponse>(`${this.base}/staff/notify/admins`, req, { withCredentials: true });
        }
        notifyAll(req: NotifyRequest): Observable<NotifyResponse> {
          return this.http.post<NotifyResponse>(`${this.base}/staff/notify/all`, req, { withCredentials: true });
        }
        notifyIndividual(req: NotifyRequest): Observable<NotifyResponse> {
          return this.http.post<NotifyResponse>(`${this.base}/staff/notify/individual`, req, { withCredentials: true });
        }
        getTeachers(): Observable<StaffUser[]> {
          return this.http.get<StaffUser[]>(`${this.base}/staff/teachers`, { withCredentials: true });
        }
        getAdmins(): Observable<StaffUser[]> {
          return this.http.get<StaffUser[]>(`${this.base}/staff/admins`, { withCredentials: true });
        }
      }
      ```

- [ ] 6. Replace `notification.component.ts` with the full Staff Notifications page component.
      The existing file is a toast popup; replace the entire file with `StaffNotificationsComponent`
      (class name changes, selector changes to `app-staff-notifications`, templateUrl + styleUrls
      point to `notification.html` and `notification.css`).
      Files: `frontend/learnplay/src/app/teacher/components/notification/notification.component.ts`
      Verify: `ng build` — no errors.

      ```typescript
      import { Component, OnInit } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { FormsModule } from '@angular/forms';
      import { StaffNotificationService, StaffUser, NotifyRequest } from '../../services/staff-notification.service';

      interface SentLog {
        timestamp: Date;
        recipient: string;
        message: string;
        status: 'sent' | 'error';
      }

      @Component({
        selector: 'app-staff-notifications',
        standalone: true,
        imports: [CommonModule, FormsModule],
        templateUrl: './notification.html',
        styleUrls: ['./notification.css']
      })
      export class StaffNotificationsComponent implements OnInit {
        teachers: StaffUser[] = [];
        admins: StaffUser[] = [];

        recipientType: 'teachers' | 'admins' | 'all' | 'individual' = 'teachers';
        selectedPhone = '';
        subject = '';
        message = '';
        maxChars = 160;

        sending = false;
        successMsg = '';
        errorMsg = '';

        log: SentLog[] = [];

        constructor(private staffSvc: StaffNotificationService) {}

        ngOnInit() {
          this.staffSvc.getTeachers().subscribe({ next: t => this.teachers = t, error: () => {} });
          this.staffSvc.getAdmins().subscribe({ next: a => this.admins = a, error: () => {} });
        }

        get charsLeft(): number { return this.maxChars - this.message.length; }

        quickBroadcast(type: 'teachers' | 'admins' | 'all') {
          this.recipientType = type;
          if (this.message.trim()) this.send();
        }

        send() {
          if (!this.message.trim()) { this.errorMsg = 'Message cannot be empty.'; return; }
          if (this.recipientType === 'individual' && !this.selectedPhone.trim()) {
            this.errorMsg = 'Select a recipient for individual send.'; return;
          }
          this.sending = true; this.successMsg = ''; this.errorMsg = '';

          const req: NotifyRequest = { message: this.message, subject: this.subject };
          if (this.recipientType === 'individual') req.phoneNumber = this.selectedPhone;

          const call$ =
            this.recipientType === 'teachers' ? this.staffSvc.notifyTeachers(req) :
            this.recipientType === 'admins'   ? this.staffSvc.notifyAdmins(req)   :
            this.recipientType === 'all'      ? this.staffSvc.notifyAll(req)      :
                                                this.staffSvc.notifyIndividual(req);

          call$.subscribe({
            next: res => {
              this.sending = false;
              this.successMsg = res.data || 'Notification sent!';
              this.log.unshift({
                timestamp: new Date(),
                recipient: this.recipientType === 'individual' ? this.selectedPhone : this.recipientType,
                message: this.message,
                status: 'sent'
              });
              this.message = ''; this.subject = '';
            },
            error: () => {
              this.sending = false;
              this.errorMsg = 'Failed to send. Check your connection or try again.';
              this.log.unshift({ timestamp: new Date(), recipient: this.recipientType, message: this.message, status: 'error' });
            }
          });
        }

        get allStaff(): StaffUser[] { return [...this.teachers, ...this.admins]; }
      }
      ```

- [ ] 7. Create `notification.html` template.
      Three broadcast cards (Notify All Teachers / Admins / All Staff), compose form with
      recipient dropdown, optional individual staff selector, subject input, 160-char message
      textarea with counter, send button with spinner, and recent notifications log table.
      Theme: `from-[#166534] to-[#14532d]` gradients, `bg-green-100 text-green-700` for card icons,
      `font-[Fredoka]` throughout.
      Files: `frontend/learnplay/src/app/teacher/components/notification/notification.html`
      Verify: `ng build` — no template errors. Navigate to `/courses/notifications` — page renders.

      See FEAT-002.json step 3 for the complete HTML. Key structural sections:
      - `<div class="min-h-screen bg-gray-50 p-4 md:p-8">` wrapper
      - Header with bell SVG + gradient icon box
      - `grid grid-cols-1 md:grid-cols-3 gap-4` for the 3 broadcast cards (each calls `quickBroadcast('teachers'|'admins'|'all')`)
      - Compose card: recipient `<select [(ngModel)]="recipientType">`, conditional individual staff `<select>`, subject `<input>`, message `<textarea [maxlength]="maxChars">`, send `<button>` with spinner SVG
      - History `<table>` with `*ngFor="let entry of log"` rows; status badge uses conditional green/red Tailwind classes

- [ ] 8. Create `notification.css`.
      Minimal styles: `:host { display: block; }` and the spinner keyframe animation (Tailwind
      `animate-spin` may not be in the purge set for a custom element, so define it explicitly).
      Files: `frontend/learnplay/src/app/teacher/components/notification/notification.css`
      Verify: `ng build` — no errors.

      ```css
      :host {
        display: block;
      }

      .animate-spin {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      ```

- [ ] 9. Register the `/courses/notifications` route in `teacher-routing-module.ts`.
      Add import for `StaffNotificationsComponent` and add `{ path: 'notifications', component: StaffNotificationsComponent }` to the children array.
      Files: `frontend/learnplay/src/app/teacher/teacher-routing-module.ts`
      Verify: `ng build` — no errors. `ng serve` → navigate to `/courses/notifications` → page loads.

      Exact import to add after the last existing import line:
      ```typescript
      import { StaffNotificationsComponent } from './components/notification/notification.component';
      ```
      Exact route entry to add inside the `children` array (after the last existing `{ path: ':courseId/...' }` entry):
      ```typescript
      { path: 'notifications', component: StaffNotificationsComponent }
      ```

- [ ] 10. Add Notifications bell-icon nav button to the teacher sidebar.
       Insert one `<button>` block into `sidebar.html` after the closing `</ng-container>` of
       the `*ngIf="currentPage === 'dashboard'"` block and before `</nav>`. Pattern is identical
       to the existing Home button: `navigate('/courses/notifications')`, active highlight via
       `isActive('/courses/notifications')`.
       Files: `frontend/learnplay/src/app/teacher/components/sidebar/sidebar.html`
       Verify: `ng serve` → sidebar shows "Notifications" label when expanded, bell icon when collapsed; clicking navigates to `/courses/notifications` and highlights the item.

       Button markup to insert:
       ```html
       <button (click)="navigate('/courses/notifications')"
         class="flex items-center gap-3 px-2 py-[10px] rounded-xl transition-all duration-200 text-left w-full"
         [style.background]="isActive('/courses/notifications') ? 'rgba(255,255,255,0.12)' : 'transparent'">
         <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
           [style.background]="isActive('/courses/notifications') ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'">
           <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" stroke-width="1.8">
             <path stroke-linecap="round" stroke-linejoin="round"
               d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
           </svg>
         </div>
         <span *ngIf="isExpanded" class="font-[Fredoka] font-semibold text-[16px] text-white whitespace-nowrap">Notifications</span>
       </button>
       ```

---

## Dependency order

FEAT-001 items (1–4) must be done before FEAT-002 items (5–10). Within each FEAT, items must be done in order (each step depends on the previous file existing). Items 5–10 are mutually independent within FEAT-002 except that item 6 imports from item 5, item 7 is needed by item 6's templateUrl, and item 9 imports the component from item 6.
