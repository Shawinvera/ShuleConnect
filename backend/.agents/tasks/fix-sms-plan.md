# Implementation Plan: SMS Notifications & Frontend Bell Icons

## Context discovered during exploration

**Backend build command:** `mvn spring-boot:run` (from `backend/` directory)  
**Frontend build command:** `npm run build` or `ng build` (from `frontend/learnplay/`)  
**Backend base package:** `com.softkit.wazi`  
**Angular pattern:** All components use `standalone: true`. Routes are added to per-module routing files.

### Key findings

- `LessonController.java` already has `POST /api/lesson/daily/send` and `POST /api/lesson/reminders/trigger` — both delegate to `reminderScheduler.dailyReminders()`. The endpoints exist; the method inside the scheduler is what actually sends SMS.
- `ReminderScheduler.dailyReminders()` already queries `lessonRepo.findUpcomingAssignments`, `findUpcomingExams`, `findLatestActiveLesson`, and `learnerRepo.findAllLearnersWithPhones()`. It sends via `atService.sendAssignmentReminder`, `atService.sendExamReminder`, and `atService.sendDailyLesson`. **This logic is complete.**
- The scheduler only targets **learners**. The user now wants guardians and teachers included. `AppUserRepo.findActiveUsersByRole(String role)` already exists and returns users with non-null phones and `activated = true`.
- `ATService.sendSms()` logs AFTER the HTTP call ("AT SMS response: {}"). The task requires a log line BEFORE the call with `apiUrl`, `username`, and recipient.
- The `BaseDto` `ClassNotFoundException` at startup is a separate Maven/classpath issue (the class exists in source; it is likely a stale build artifact). It must be fixed before the backend can be tested.

---

## Plan items

- [ ] 1. **Fix backend build — clean stale compiled artifacts**

  The startup error `ClassNotFoundException: com.softkit.wazi.model.BaseDto` happens because Hibernate tries to load a class from a stale compiled artifact that doesn't match the source. `BaseDto` exists in source (`src/main/java/com/softkit/wazi/model/BaseDto.java`), so this is a dirty-build issue.

  Run a clean build to regenerate all compiled classes and the QueryDSL Q-types.

  Files: none (build output only)  
  Verify: From `c:\Users\PC\ShuleConnect\backend\`, run:
  ```
  mvn clean package -DskipTests
  ```
  Expected: `BUILD SUCCESS` with no `ClassNotFoundException`.

---

- [ ] 2. **Add pre-call log line to `ATService.sendSms()`**

  Inside `sendSms(String to, String message)`, add a log statement immediately before the `restTemplate.postForObject(...)` call so the AT API URL, the AT username, and the recipient phone appear in logs on every real (non-dev) SMS dispatch.

  File: `c:\Users\PC\ShuleConnect\backend\src\main\java\com\softkit\wazi\service\ATService.java`

  Insert after the `HttpEntity` construction, before the `try` block:
  ```java
  log.info("AT API URL: {}, Username: {}, To: {}", africastalkingApi, africastalkingUsername, to);
  ```

  Verify: Run `mvn clean package -DskipTests` from `backend/` — `BUILD SUCCESS`. When an SMS is triggered, the log line appears before "AT SMS response:".

---

- [ ] 3. **Extend `ReminderScheduler.dailyReminders()` to also notify guardians and teachers**

  The scheduler currently fetches only learners. Add two additional recipient lists using the existing `appUserRepo.findActiveUsersByRole(String role)` method. Send the same daily-lesson summary and all reminders to these users.

  File: `c:\Users\PC\ShuleConnect\backend\src\main\java\com\softkit\wazi\component\ReminderScheduler.java`

  Steps:
  1. Add `private final AppUserRepo appUserRepo;` field (Lombok `@RequiredArgsConstructor` will inject it).
  2. Add import: `import com.softkit.wazi.repository.AppUserRepo;` and `import com.softkit.wazi.entities.AppUser;`.
  3. In `dailyReminders()`, after the existing `learnerRepo.findAllLearnersWithPhones()` call, add:
     ```java
     List<AppUser> guardians = appUserRepo.findActiveUsersByRole("GUARDIAN");
     List<AppUser> teachers  = appUserRepo.findActiveUsersByRole("TEACHER");
     ```
  4. Build a combined extra-recipient phone list:
     ```java
     List<String> extraPhones = Stream.concat(guardians.stream(), teachers.stream())
         .map(AppUser::getPhoneNumber)
         .filter(p -> p != null && !p.isBlank())
         .distinct()
         .collect(java.util.stream.Collectors.toList());
     ```
     Add import: `import java.util.stream.Stream;` and `import java.util.stream.Collectors;`.
  5. In the assignment-reminder loop, after the inner loop over learners, add an equivalent loop over `extraPhones`:
     ```java
     for (String phone : extraPhones) {
         atService.sendAssignmentReminder(phone, lesson.getAssignmentTitle(), lesson.getAssignmentDeadline());
     }
     ```
  6. Do the same in the exam-reminder loop.
  7. In the daily-lesson block, after the learner loop, add:
     ```java
     for (String phone : extraPhones) {
         atService.sendDailyLesson(phone, name, summary);
     }
     ```

  File: `c:\Users\PC\ShuleConnect\backend\src\main\java\com\softkit\wazi\component\ReminderScheduler.java`  
  Verify: `mvn clean package -DskipTests` → `BUILD SUCCESS`.

---

- [ ] 4. **Add bell icon to learner (kid) navbar — desktop toolbar and mobile bottom bar**

  The kid navbar has two zones to update:

  **A. Desktop toolbar** (`<mat-toolbar>`) — in the "Right Points + Switcher" `<div class="flex gap-3 sm:gap-[20px] items-center">`, insert a bell button just before the "User Switcher Chip" `<div class="relative"...>`:

  ```html
  <!-- Notifications Bell -->
  <button
    (click)="goToNotifications()"
    class="hidden md:flex bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full w-[45px] h-[45px] sm:w-[55px] sm:h-[55px] items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
    title="Notifications"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="w-[22px] h-[22px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  </button>
  ```

  **B. Mobile bottom nav** — inside the bottom `<nav>` bar, add a Notifications button between "Activities" and the "Points" centre slot (or between "Points" and "Parent", keeping five items). Insert it between the "Points" slot and the "Parent Dashboard" button:

  ```html
  <!-- Notifications -->
  <button
    (click)="goToNotifications(); trackMobileMenuAction('notifications')"
    class="bottom-nav-item"
    [class.bottom-nav-item--active]="isNotificationsPage"
  >
    <div class="bottom-nav-icon-wrap" [class.bottom-nav-icon-wrap--active]="isNotificationsPage">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-[20px] h-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    </div>
    <span class="bottom-nav-label">Alerts</span>
  </button>
  ```

  File: `c:\Users\PC\ShuleConnect\frontend\learnplay\src\app\kid\reusable\navbar\navbar.html`

  Also add to `navbar.ts`:
  - A `isNotificationsPage` getter that checks `this.router.url.startsWith('/kid/notifications')`
  - A `goToNotifications()` method: `this.router.navigate(['/kid/notifications'])`

  File: `c:\Users\PC\ShuleConnect\frontend\learnplay\src\app\kid\reusable\navbar\navbar.ts`

  Verify: `ng build` from `frontend/learnplay/` → `Compilation complete`.

---

- [ ] 5. **Add bell icon to parent (guardian) navbar — desktop and mobile**

  Same pattern as item 4, applied to the parent navbar.

  **A. Desktop nav (`<nav>`)** — in the right-side `<div class="flex items-center gap-2 md:gap-3 lg:gap-5">`, insert the bell button just before `<div class="relative" (click)="$event.stopPropagation()">` (the switcher chip):

  ```html
  <!-- Notifications Bell -->
  <button
    (click)="goToNotifications()"
    class="hidden md:flex bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full w-[45px] h-[45px] lg:w-[55px] lg:h-[55px] items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
    title="Notifications"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="w-[22px] h-[22px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  </button>
  ```

  **B. Mobile bottom nav** — insert a Notifications button between the "Home" button and the first conditional (`<ng-container *ngIf="isOnChildDetailsPage"`):

  ```html
  <!-- Notifications -->
  <button
    (click)="goToNotifications(); trackMobileMenuAction('notifications')"
    class="bottom-nav-item"
    [class.bottom-nav-item--active]="isNotificationsPage"
  >
    <div class="bottom-nav-icon-wrap" [class.bottom-nav-icon-wrap--active]="isNotificationsPage">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    </div>
    <span class="bottom-nav-label">Alerts</span>
  </button>
  ```

  File: `c:\Users\PC\ShuleConnect\frontend\learnplay\src\app\parent\components\parent-navbar\parent-navbar.html`

  Also add to `parent-navbar.ts`:
  - `isNotificationsPage` getter: `return this.router.url.startsWith('/parent/notifications')`
  - `goToNotifications()` method: `this.router.navigate(['/parent/notifications'])`

  File: `c:\Users\PC\ShuleConnect\frontend\learnplay\src\app\parent\components\parent-navbar\parent-navbar.ts`

  Verify: `ng build` → `Compilation complete`.

---

- [ ] 6. **Create the kid (learner) SMS notifications component**

  Follow the `standalone: true` pattern used by every existing kid component (e.g., `lesson-lists.ts`). The component is a simple page that displays a static "SMS Notifications" message and lists the notification types (daily lessons, assignment reminders, exam reminders). Data population can be a later enhancement.

  Create three files:

  **`sms-notifications.ts`**
  ```typescript
  import { Component } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { Router } from '@angular/router';
  import { Navbar } from '../../reusable/navbar/navbar';

  @Component({
    selector: 'app-sms-notifications',
    standalone: true,
    imports: [CommonModule, Navbar],
    templateUrl: './sms-notifications.html',
    styleUrls: ['./sms-notifications.css'],
  })
  export class SmsNotifications {
    constructor(private router: Router) {}

    goBack() {
      this.router.navigate(['/kid']);
    }
  }
  ```

  **`sms-notifications.html`** — a page matching the kid green theme (same gradient used in `kids-dashboard`):
  ```html
  <app-navbar></app-navbar>
  <div class="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-white px-4 sm:px-8 lg:px-[150px] pt-6 pb-24">
    <div class="max-w-2xl mx-auto">
      <h1 class="font-fredoka font-bold text-[28px] text-[#166534] mb-2">SMS Notifications</h1>
      <p class="font-fredoka text-[15px] text-[#6B7280] mb-6">You will receive SMS alerts for the following:</p>
      <div class="flex flex-col gap-4">
        <div class="bg-white rounded-2xl shadow p-4 border border-[#bbf7d0]">
          <p class="font-fredoka font-semibold text-[16px] text-[#166534]">📚 Daily Lessons</p>
          <p class="font-fredoka text-[14px] text-[#6B7280] mt-1">A summary of today's active lesson is sent each morning.</p>
        </div>
        <div class="bg-white rounded-2xl shadow p-4 border border-[#bbf7d0]">
          <p class="font-fredoka font-semibold text-[16px] text-[#166534]">📝 Assignment Reminders</p>
          <p class="font-fredoka text-[14px] text-[#6B7280] mt-1">Reminders are sent when an assignment deadline is within 24 hours.</p>
        </div>
        <div class="bg-white rounded-2xl shadow p-4 border border-[#bbf7d0]">
          <p class="font-fredoka font-semibold text-[16px] text-[#166534]">🎓 Exam Reminders</p>
          <p class="font-fredoka text-[14px] text-[#6B7280] mt-1">Reminders are sent when an exam is within 48 hours.</p>
        </div>
      </div>
    </div>
  </div>
  ```

  **`sms-notifications.css`** — empty file (Tailwind covers all styling).

  Files to create:
  - `c:\Users\PC\ShuleConnect\frontend\learnplay\src\app\kid\components\sms-notifications\sms-notifications.ts`
  - `c:\Users\PC\ShuleConnect\frontend\learnplay\src\app\kid\components\sms-notifications\sms-notifications.html`
  - `c:\Users\PC\ShuleConnect\frontend\learnplay\src\app\kid\components\sms-notifications\sms-notifications.css`

  Verify: `ng build` → `Compilation complete`.

---

- [ ] 7. **Create the parent (guardian) SMS notifications component**

  Same structure as item 6, but uses `ParentNavbar` and the parent green theme. Follows the `recent-activities.ts` pattern exactly.

  **`sms-notifications.ts`**
  ```typescript
  import { Component } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { Router } from '@angular/router';
  import { ParentNavbar } from '../parent-navbar/parent-navbar';

  @Component({
    selector: 'app-parent-sms-notifications',
    standalone: true,
    imports: [CommonModule, ParentNavbar],
    templateUrl: './sms-notifications.html',
    styleUrls: ['./sms-notifications.css'],
  })
  export class ParentSmsNotifications {
    constructor(private router: Router) {}

    goBack() {
      this.router.navigate(['/parent']);
    }
  }
  ```

  **`sms-notifications.html`** — parent theme (same green, `font-fredoka`):
  ```html
  <app-parent-navbar></app-parent-navbar>
  <div class="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-white px-4 sm:px-8 lg:px-[150px] pt-6 pb-24">
    <div class="max-w-2xl mx-auto">
      <h1 class="font-fredoka font-bold text-[28px] text-[#166534] mb-2">SMS Notifications</h1>
      <p class="font-fredoka text-[15px] text-[#6B7280] mb-6">Your children and you will receive SMS alerts for the following:</p>
      <div class="flex flex-col gap-4">
        <div class="bg-white rounded-2xl shadow p-4 border border-[#bbf7d0]">
          <p class="font-fredoka font-semibold text-[16px] text-[#166534]">📚 Daily Lessons</p>
          <p class="font-fredoka text-[14px] text-[#6B7280] mt-1">A summary of today's active lesson is sent each morning to all learners and guardians.</p>
        </div>
        <div class="bg-white rounded-2xl shadow p-4 border border-[#bbf7d0]">
          <p class="font-fredoka font-semibold text-[16px] text-[#166534]">📝 Assignment Reminders</p>
          <p class="font-fredoka text-[14px] text-[#6B7280] mt-1">Reminders are sent when an assignment deadline is within 24 hours.</p>
        </div>
        <div class="bg-white rounded-2xl shadow p-4 border border-[#bbf7d0]">
          <p class="font-fredoka font-semibold text-[16px] text-[#166534]">🎓 Exam Reminders</p>
          <p class="font-fredoka text-[14px] text-[#6B7280] mt-1">Reminders are sent when an exam is within 48 hours.</p>
        </div>
      </div>
    </div>
  </div>
  ```

  **`sms-notifications.css`** — empty file.

  Files to create:
  - `c:\Users\PC\ShuleConnect\frontend\learnplay\src\app\parent\components\sms-notifications\sms-notifications.ts`
  - `c:\Users\PC\ShuleConnect\frontend\learnplay\src\app\parent\components\sms-notifications\sms-notifications.html`
  - `c:\Users\PC\ShuleConnect\frontend\learnplay\src\app\parent\components\sms-notifications\sms-notifications.css`

  Verify: `ng build` → `Compilation complete`.

---

- [ ] 8. **Register `/kid/notifications` route in `KidRoutingModule`**

  Add `SmsNotifications` as a top-level (non-child) route so it gets its own full page with the navbar, not nested inside `KidsDashboard`'s `<router-outlet>`. This matches the pattern used by `recent-activities` in the parent module.

  File: `c:\Users\PC\ShuleConnect\frontend\learnplay\src\app\kid\kid-routing-module.ts`

  Add import:
  ```typescript
  import { SmsNotifications } from './components/sms-notifications/sms-notifications';
  ```

  Add route entry at the top level of the `routes` array (sibling to the existing `KidsDashboard` route object, not inside its `children`):
  ```typescript
  { path: 'notifications', component: SmsNotifications, canActivate: [authGuard], data: { role: 'GUARDIAN' } },
  ```

  The final routes array:
  ```typescript
  const routes: Routes = [
    {
      path: '',
      component: KidsDashboard,
      canActivate: [authGuard],
      data: { role: 'GUARDIAN' },
      children: [
        { path: '', component: MainContent },
        { path: 'subject/:subjectId/:gsId', component: SubjectLessons },
        { path: 'subject/:subjectId/unit/:unitId', component: LessonUnit },
        { path: 'subject/:subjectId/unit/:unitId/subtopic/:subTopicId', component: LessonLists },
        { path: 'subject/:subjectId/unit/:unitId/subtopic/:subTopicId/lesson/:lessonId', component: UnitContent },
      ],
    },
    { path: 'notifications', component: SmsNotifications, canActivate: [authGuard], data: { role: 'GUARDIAN' } },
  ];
  ```

  Verify: `ng build` → `Compilation complete`. Navigate to `/kid/notifications` → page renders.

---

- [ ] 9. **Register `/parent/notifications` route in `ParentRoutingModule`**

  Add `ParentSmsNotifications` as a sibling route at the same level as `edit-learner-profile` and `recent-activities` (outside the `DashboardLayout` children, so it renders with its own full-page navbar). This exactly mirrors the `recent-activities` route pattern already in the file.

  File: `c:\Users\PC\ShuleConnect\frontend\learnplay\src\app\parent\parent-routing-module.ts`

  Add import:
  ```typescript
  import { ParentSmsNotifications } from './components/sms-notifications/sms-notifications';
  ```

  Add route:
  ```typescript
  { path: 'notifications', component: ParentSmsNotifications, canActivate: [authGuard], data: { role: 'GUARDIAN' } },
  ```

  Final routes array:
  ```typescript
  const routes: Routes = [
    {
      path: '',
      component: DashboardLayout,
      canActivate: [authGuard],
      data: { role: 'GUARDIAN' },
      children: [
        { path: '', component: ParentPage, canActivate: [authGuard], data: { role: 'GUARDIAN' } },
        { path: 'add-child', component: AddChild, canActivate: [authGuard], data: { role: 'GUARDIAN' } },
        { path: 'child/:id', component: ChildDetails, canActivate: [authGuard], data: { role: 'GUARDIAN' } },
        { path: 'select-learner', component: SelectLearner, canActivate: [authGuard], data: { role: 'GUARDIAN' } }
      ]
    },
    { path: 'edit-learner-profile', component: EditLearnerProfile, canActivate: [authGuard], data: { role: 'GUARDIAN' } },
    { path: 'recent-activities', component: RecentActivities, canActivate: [authGuard], data: { role: 'GUARDIAN' } },
    { path: 'notifications', component: ParentSmsNotifications, canActivate: [authGuard], data: { role: 'GUARDIAN' } },
  ];
  ```

  Verify: `ng build` → `Compilation complete`. Navigate to `/parent/notifications` → page renders.

---

## Repository query methods — what exists vs. what needs adding

| Query needed | Repo | Method | Status |
|---|---|---|---|
| Active lesson (latest) | `LessonRepo` | `findLatestActiveLesson(Pageable)` | **EXISTS** |
| Upcoming assignments (now → now+24h) | `LessonRepo` | `findUpcomingAssignments(Instant, Instant)` | **EXISTS** |
| Upcoming exams (now → now+48h) | `LessonRepo` | `findUpcomingExams(Instant, Instant)` | **EXISTS** |
| All learners with phones | `LearnerRepo` | `findAllLearnersWithPhones()` | **EXISTS** |
| Active users by role with phones | `AppUserRepo` | `findActiveUsersByRole(String role)` | **EXISTS** |

No new repository methods are needed. All queries required for the SMS logic are already present.

## Dependency order

Items must be implemented in this order:  
1 (clean build) → 2 (AT log) → 3 (extend scheduler) → 4 (kid bell) → 5 (parent bell) → 6 (kid notifications page) → 7 (parent notifications page) → 8 (kid route) → 9 (parent route)

Items 4–5 depend on items 6–7 existing (the navbar calls `goToNotifications()` which navigates to routes registered in items 8–9), but the TypeScript method can be written before the component exists as long as the build runs after all files exist. To keep each step buildable, complete items 6 and 7 before items 4 and 5.

Safe order: **1 → 2 → 3 → 6 → 7 → 4 → 5 → 8 → 9**
