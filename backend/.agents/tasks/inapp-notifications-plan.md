# Implementation Plan: In-App Notification System

## Context discovered during exploration

**Backend:** Spring Boot 4.0.2, Java 17, MySQL, package `com.softkit.wazi`.
- Build: `mvn spring-boot:run` from `backend/`. Port 8112, context-path `/api`.
- JPA: `ddl-auto: update` — Hibernate creates the `app_notifications` table automatically on first boot; no migration file is needed.
- Entity pattern: String `@Id`, `@PrePersist` calls `UuidGenerator.generateEntityUuid("prefix")`, Lombok `@Builder @Getter @Setter @NoArgsConstructor @AllArgsConstructor`. See `AppUser.java`.
- Repository pattern: `extends JpaRepository<Entity, String>`, `@Modifying @Transactional` JPQL for bulk updates. See `AppUserRepo.java`.
- Current user: `RequestContext.getThreadData().getUserId()` — set by `JwtAuthenticationFilter` from the JWT cookie. See `JwtAuthenticationFilter.java` and `RequestContext.java`.
- `StaffNotificationService` has six bulk-notify methods: `notifyAllTeachers`, `notifyAllAdmins`, `notifyAllStaff` (calls both), `notifyAllLearners`, `notifyAllGuardians`, `notifyEveryone` (calls learners+guardians+teachers), plus `notifyIndividual`. Each calls `atService.sendBulkSms` / `atService.sendSms`. In-app saves go in after the SMS calls.
- `ReminderScheduler.dailyReminders()` calls `atService.sendDailyLesson`, `sendAssignmentReminder`, `sendExamReminder` per learner. In-app saves for the learner's own `appUser.getId()` go here too.
- Security: all requests except `/auth/**`, `/public/**` require a valid JWT. The `/notifications/**` controller will fall under `anyRequest().authenticated()` automatically.
- `CustomResponse` is the standard response wrapper (`@Builder`, `successful`, `errorMessage`, `data`).

**Frontend:** Angular 20, Tailwind CSS, `font-[Fredoka]`, dark green theme `#166534 / #14532d`. `environment.apiUrl = 'http://localhost:8112/api'`.
- Existing `notification.service.ts` at `src/app/services/` is a **toast/UI service** (BehaviorSubject of UI toast objects). The new API service must be named differently — use `notification-bell.service.ts`.
- Shared standalone components live in `src/app/shared/components/<name>/`. Pattern: `standalone: true`, `imports: [CommonModule, ...]`, separate `.ts`, `.html`, `.css` files.
- **Kid navbar** (`src/app/kid/reusable/navbar/navbar.ts`): standalone, `imports: [MatToolbarModule, CommonModule]`. Right-side flex row is `<div class="flex gap-3 sm:gap-[20px] items-center">` — the bell goes *before* the Points Badge div inside that row. Desktop-only on the top bar; for mobile the bell goes in the mobile bottom nav `<!-- Home -->...<!-- Activities -->` section, as a new bottom-nav item between Activities and the Points pill slot.
- **Parent navbar** (`src/app/parent/components/parent-navbar/parent-navbar.ts`): standalone, `imports: [CommonModule]`. Right-side flex row is `<div class="flex items-center gap-2 md:gap-3 lg:gap-5">`. The bell goes *before* the role-switcher chip `<div class="relative" (click)="$event.stopPropagation()">` inside that row.
- HTTP calls use `withCredentials: true` for cookie auth (see `auth.service.ts`).
- Build: `ng build` or `ng serve` from `frontend/learnplay/`.

---

## Implementation Plan

- [ ] 1. Create `AppNotification` entity.

      Model a persistent in-app notification row. Use the same field/annotation pattern as `AppUser`: `@Entity @Table(name="app_notifications")`, `@Id String id`, `@PrePersist` calls `UuidGenerator.generateEntityUuid("notif")`, Lombok `@Builder @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Slf4j`. Fields: `id` (String, PK), `userId` (String — foreign key by value, no join, to avoid loading the full user graph), `title` (String), `message` (String, `@Column(columnDefinition="TEXT")`), `type` (String — values like `"SMS"`, `"LESSON"`, `"REMINDER"`, `"GENERAL"`), `isRead` (Boolean, `@Builder.Default false`), `createdAt` (Instant, set in `@PrePersist`).

      Files:
      - Create `backend/src/main/java/com/softkit/wazi/entities/AppNotification.java`

      Verify: `cd backend && mvn compile -q` — compiles without error.

- [ ] 2. Create `AppNotificationRepo`.

      Five repository methods on top of `JpaRepository<AppNotification, String>`:
      1. `List<AppNotification> findByUserIdOrderByCreatedAtDesc(String userId)`
      2. `List<AppNotification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(String userId)`
      3. `long countByUserIdAndIsReadFalse(String userId)`
      4. `@Modifying @Transactional @Query("UPDATE AppNotification n SET n.isRead = true WHERE n.userId = :userId") void markAllReadByUserId(@Param("userId") String userId)`
      5. `@Modifying @Transactional @Query("UPDATE AppNotification n SET n.isRead = true WHERE n.id = :id") void markReadById(@Param("id") String id)`

      Files:
      - Create `backend/src/main/java/com/softkit/wazi/repository/AppNotificationRepo.java`

      Verify: `cd backend && mvn compile -q` — compiles without error.

- [ ] 3. Create `NotificationService`.

      Seven methods:
      - `saveNotification(String userId, String title, String message, String type)` — builds and saves one `AppNotification`.
      - `saveNotificationsForUsers(List<AppUser> users, String title, String message, String type)` — calls `saveNotification` for each user's `getId()`.
      - `saveNotificationsForLearnerUsers(List<Learner> learners, String title, String message, String type)` — calls `saveNotification` for each `learner.getAppUser().getId()`.
      - `getNotificationsForUser(String userId)` — returns `appNotificationRepo.findByUserIdOrderByCreatedAtDesc(userId)`.
      - `getUnreadCount(String userId)` — returns `appNotificationRepo.countByUserIdAndIsReadFalse(userId)`.
      - `markAllRead(String userId)` — calls `appNotificationRepo.markAllReadByUserId(userId)`.
      - `markOneRead(String id)` — calls `appNotificationRepo.markReadById(id)`.

      Inject `AppNotificationRepo` with `@RequiredArgsConstructor`. Annotate with `@Service @RequiredArgsConstructor @Slf4j`.

      Files:
      - Create `backend/src/main/java/com/softkit/wazi/service/NotificationService.java`

      Verify: `cd backend && mvn compile -q` — compiles without error.

- [ ] 4. Update `StaffNotificationService` to save in-app notifications after each SMS dispatch, and update `ReminderScheduler` to save per-learner in-app notifications.

      **StaffNotificationService changes** — inject `NotificationService`:
      - `notifyAllTeachers(message)`: after `atService.sendBulkSms`, call `notificationService.saveNotificationsForUsers(teachers, "School Notification", PREFIX + message, "SMS")`.
      - `notifyAllAdmins(message)`: after `atService.sendBulkSms`, call `notificationService.saveNotificationsForUsers(admins, "School Notification", PREFIX + message, "SMS")`.
      - `notifyAllLearners(message)`: after `atService.sendBulkSms`, call `notificationService.saveNotificationsForLearnerUsers(learners, "School Notification", PREFIX + message, "SMS")`.
      - `notifyAllGuardians(message)`: after `atService.sendBulkSms`, call `notificationService.saveNotificationsForUsers(guardians, "School Notification", PREFIX + message, "SMS")`.
      - `notifyIndividual(phoneNumber, message)`: after `atService.sendSms`, find the user by phone via `appUserRepo.findByPhoneNumber(phoneNumber)` (add this query to `AppUserRepo` — see below) and call `notificationService.saveNotification(user.getId(), "Direct Message", PREFIX + message, "SMS")` if present.
      - `notifyAllStaff` and `notifyEveryone` delegate to the above methods so they already benefit transitively.

      **AppUserRepo addition** — add: `Optional<AppUser> findByPhoneNumber(String phoneNumber)` (derived query, no JPQL needed).

      **ReminderScheduler changes** — inject `NotificationService`:
      - In the assignment-reminder loop: after `atService.sendAssignmentReminder(...)`, call `notificationService.saveNotification(learner.getAppUser().getId(), "Assignment Due", "Assignment due: " + lesson.getAssignmentTitle(), "REMINDER")`.
      - In the exam-reminder loop: after `atService.sendExamReminder(...)`, call `notificationService.saveNotification(learner.getAppUser().getId(), "Exam Reminder", "Exam: " + lesson.getExamName(), "REMINDER")`.
      - In the daily-lesson loop: after `atService.sendDailyLesson(...)`, call `notificationService.saveNotification(learner.getAppUser().getId(), "Today's Lesson", name + ": " + summary, "LESSON")`.

      Files:
      - Modify `backend/src/main/java/com/softkit/wazi/service/StaffNotificationService.java`
      - Modify `backend/src/main/java/com/softkit/wazi/repository/AppUserRepo.java`
      - Modify `backend/src/main/java/com/softkit/wazi/component/ReminderScheduler.java`

      Verify: `cd backend && mvn compile -q` — compiles without error.

- [ ] 5. Create `NotificationController`.

      Four endpoints, all secured by existing `anyRequest().authenticated()`:
      - `GET /notifications/my` — calls `notificationService.getNotificationsForUser(RequestContext.getThreadData().getUserId())`, returns `ResponseEntity.ok(list)`.
      - `GET /notifications/my/unread-count` — returns `ResponseEntity.ok(CustomResponse.builder().successful(true).data(count).build())`.
      - `POST /notifications/mark-read/{id}` — calls `notificationService.markOneRead(id)`, returns ok `CustomResponse`.
      - `POST /notifications/mark-all-read` — calls `notificationService.markAllRead(userId)`, returns ok `CustomResponse`.

      Annotate with `@RestController @RequestMapping("/notifications") @RequiredArgsConstructor`. Use `RequestContext.getThreadData().getUserId()` to get the calling user's ID on every request (same pattern as the existing security filter sets it).

      Files:
      - Create `backend/src/main/java/com/softkit/wazi/controller/NotificationController.java`

      Verify: `cd backend && mvn spring-boot:run` starts without error (Hibernate creates `app_notifications` table on startup). Then `curl -s http://localhost:8112/api/notifications/my` returns a 401 (confirms the endpoint is registered and auth-protected).

- [ ] 6. Create the frontend `NotificationBellService`.

      Angular service at `src/app/services/notification-bell.service.ts`. Named `NotificationBellService` to avoid colliding with the existing `NotificationService` toast service. `providedIn: 'root'`. Inject `HttpClient`. Use `environment.apiUrl` as the base URL.

      Methods:
      - `getMyNotifications(): Observable<any[]>` — `GET /notifications/my` with `withCredentials: true`.
      - `getUnreadCount(): Observable<number>` — `GET /notifications/my/unread-count` with `withCredentials: true`, maps `.data` from the `CustomResponse` wrapper.
      - `markRead(id: string): Observable<any>` — `POST /notifications/mark-read/${id}` with `withCredentials: true`.
      - `markAllRead(): Observable<any>` — `POST /notifications/mark-all-read` with `withCredentials: true`.

      Files:
      - Create `frontend/learnplay/src/app/services/notification-bell.service.ts`

      Verify: `cd frontend/learnplay && ng build --configuration development 2>&1 | tail -5` — builds without TypeScript errors.

- [ ] 7. Create `NotificationBellComponent` (standalone).

      Location: `src/app/shared/components/notification-bell/`
      Three files: `notification-bell.ts`, `notification-bell.html`, `notification-bell.css`.

      **notification-bell.ts:**
      - `selector: 'app-notification-bell'`, `standalone: true`, `imports: [CommonModule]`.
      - Properties: `notifications: any[] = []`, `unreadCount = 0`, `dropdownOpen = false`, private `pollInterval: any`.
      - `ngOnInit`: call `loadUnreadCount()`, start `setInterval(() => this.loadUnreadCount(), 30000)`.
      - `ngOnDestroy`: `clearInterval(this.pollInterval)`.
      - `toggleDropdown()`: toggles `dropdownOpen`; when opening, also calls `loadNotifications()`.
      - `loadNotifications()`: subscribes to `notificationBellService.getMyNotifications()`, stores first 10 in `this.notifications`.
      - `loadUnreadCount()`: subscribes to `notificationBellService.getUnreadCount()`, stores in `this.unreadCount`.
      - `onMarkAllRead()`: calls service, sets `unreadCount = 0`, marks all `notification.isRead = true` locally.
      - `onMarkRead(n: any)`: calls `notificationBellService.markRead(n.id)`, sets `n.isRead = true`, decrements `unreadCount` if it was unread.
      - `timeAgo(isoString: string): string`: pure helper — returns "just now" / "Xm ago" / "Xh ago" / "Xd ago".
      - `preview(text: string): string`: returns `text?.length > 50 ? text.substring(0, 50) + '…' : text`.
      - `@HostListener('document:click', ['$event']) onDocumentClick(e: MouseEvent)`: closes dropdown when click is outside the host element.
      - Inject `NotificationBellService` and `ElementRef`.

      **notification-bell.html:**
      - Outer wrapper `<div class="relative">`.
      - Bell button: `<button (click)="toggleDropdown(); $event.stopPropagation()" class="relative ...">` — bell SVG icon (white, 24×24), dark-green badge `<span *ngIf="unreadCount > 0" class="absolute -top-1 -right-1 bg-[#166534] text-white text-[10px] font-fredoka font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>`.
      - Dropdown panel `<div *ngIf="dropdownOpen" class="absolute right-0 top-[calc(100%+8px)] w-[320px] bg-white rounded-[18px] border border-[#bbf7d0] shadow-[0_16px_48px_rgba(20,83,45,0.18)] z-[10001] overflow-hidden">`:
        - Header row: `<div class="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#166534] to-[#14532d]">` with title "Notifications" (white Fredoka) and "Mark all read" button.
        - Empty state: `<p *ngIf="notifications.length === 0" ...>No notifications yet</p>`.
        - List: `<div *ngFor="let n of notifications" (click)="onMarkRead(n)" class="...cursor-pointer hover:bg-[#f0fdf4] px-4 py-3 border-b border-[#f0f0f0]">` — left border `border-l-4` `[#166534]` for unread, `border-transparent` for read; title in bold Fredoka, preview text, time-ago in small muted text.

      **notification-bell.css:** dropdown slide-in animation matching the existing `switcherDropIn` keyframe pattern from `navbar.css`.

      Files:
      - Create `frontend/learnplay/src/app/shared/components/notification-bell/notification-bell.ts`
      - Create `frontend/learnplay/src/app/shared/components/notification-bell/notification-bell.html`
      - Create `frontend/learnplay/src/app/shared/components/notification-bell/notification-bell.css`

      Verify: `cd frontend/learnplay && ng build --configuration development 2>&1 | tail -5` — compiles without error.

- [ ] 8. Add `NotificationBellComponent` to the kid (learner) navbar.

      **navbar.ts** — import `NotificationBellComponent` and add it to the `imports` array.

      **navbar.html** — two insertion points:

      *Desktop top bar*: Inside `<div class="flex gap-3 sm:gap-[20px] items-center">` (the right-side group), add `<app-notification-bell class="hidden md:block"></app-notification-bell>` as the first child, before the Points Badge div.

      *Mobile bottom nav*: In `<nav class="md:hidden fixed bottom-0 ...">`, add a new `<button>` tab between the Activities button and the Points pill slot `<div class="bottom-nav-points-slot">`:
      ```html
      <button (click)="toggleNotificationDropdown()" class="bottom-nav-item relative">
        <div class="bottom-nav-icon-wrap">
          <!-- bell SVG, same 20×20 as other icons -->
          <svg .../>
          <span *ngIf="mobileUnreadCount > 0"
            class="absolute top-0 right-0 bg-[#166534] text-white text-[9px] font-fredoka font-bold rounded-full w-[14px] h-[14px] flex items-center justify-center">
            {{ mobileUnreadCount }}
          </span>
        </div>
        <span class="bottom-nav-label">Alerts</span>
      </button>
      ```
      Add `mobileUnreadCount = 0` and `toggleNotificationDropdown()` to `Navbar`. Inject `NotificationBellService` into `Navbar`, poll in `ngOnInit` alongside existing setup: `this.notificationBellService.getUnreadCount().subscribe(c => this.mobileUnreadCount = c)`. On mobile tap, navigate to a full notifications list page or toggle a fullscreen overlay — for scope, use a simple `router.navigate(['/kid/notifications'])` placeholder (the route need not exist yet; this is the mobile entry point for a later feature).

      Files:
      - Modify `frontend/learnplay/src/app/kid/reusable/navbar/navbar.ts`
      - Modify `frontend/learnplay/src/app/kid/reusable/navbar/navbar.html`

      Verify: `cd frontend/learnplay && ng build --configuration development 2>&1 | tail -5` — zero compilation errors. Visually: start `ng serve`, open the learner dashboard; the bell icon appears in the top-right of the green toolbar on desktop.

- [ ] 9. Add `NotificationBellComponent` to the parent (guardian) navbar.

      **parent-navbar.ts** — import `NotificationBellComponent`, add to `imports` array.

      **parent-navbar.html** — one insertion point:

      Inside `<div class="flex items-center gap-2 md:gap-3 lg:gap-5">` (the right-side group), add `<app-notification-bell class="hidden md:block"></app-notification-bell>` before the role-switcher chip `<div class="relative" (click)="$event.stopPropagation()">`.

      For mobile, add an "Alerts" bottom-nav tab the same way as item 8: inject `NotificationBellService` into `ParentNavbar`, expose `mobileUnreadCount`, and add a bell button to the mobile `<nav>` between the existing contextual button (Activities/Add Learner) and the Hamburger menu.

      Files:
      - Modify `frontend/learnplay/src/app/parent/components/parent-navbar/parent-navbar.ts`
      - Modify `frontend/learnplay/src/app/parent/components/parent-navbar/parent-navbar.html`

      Verify: `cd frontend/learnplay && ng build --configuration development 2>&1 | tail -5` — zero compilation errors. Visually: open the guardian dashboard; the bell icon appears in the navbar header on desktop next to the Guardian chip.

---

## Notes and assumptions

1. **No teacher-dashboard notification bell** — the user request and task summary only ask for learner and guardian navbars. The teacher dashboard is excluded from scope.
2. **No separate `/notifications` page** — the mobile tap target (`/kid/notifications`) is a placeholder. The in-dropdown list (last 10) is the primary UI. A full page can be added later.
3. **`BaseDto` is unrelated** — the error in the user's stack trace is a Hibernate classpath issue in a past run. The entity created here does not extend `BaseDto` (it is `abstract` and not an `@Entity`), following the same pattern as the existing `AppUser` and `Learner` entities.
4. **No new DB migration** — `ddl-auto: update` in `application.yaml` means Hibernate creates the `app_notifications` table automatically.
5. **`notifyAllStaff` / `notifyEveryone`** — these methods call the individual role methods, so in-app saves are inherited without additional changes to those two methods.
