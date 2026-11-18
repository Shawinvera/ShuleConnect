# Implementation Plan — Lesson Deadlines & Scheduled SMS

## Context findings

- Package root: `com.softkit.wazi`
- Entities use Lombok `@AllArgsConstructor @NoArgsConstructor @Setter @Getter @Builder`, `@PrePersist` for ID generation via `UuidGenerator.generateEntityUuid("prefix")`.
- `Lesson` entity already has `createdAt Instant`, `active Boolean`, `content LONGTEXT`. No deadline fields yet.
- `LessonDto` extends `BaseDto` (holds `id`); uses plain Lombok — **no MapStruct annotations** on individual fields. The mapper interface uses `ReportingPolicy.IGNORE` so new fields on both sides map automatically without touching `LessonMapper`.
- `LessonService.updateLesson` uses a QueryDSL `JPAUpdateClause` — new deadline fields must each get an explicit `update.set(...)` call. The `createLesson` path goes through `lessonMapper.toLessonEntity(lessonDto)` which will auto-map new fields since `IGNORE` policy is on.
- `ATService` already has `sendAssignmentReminder`, `sendExamReminder`, `sendDailyLesson`, each `@Async("asyncTaskExecutor")` and gated by `StringUtils.isDevMode()`.
- `LearnerRepo` does not yet have a phone-fetch query. `Learner.appUser` is `@ManyToOne(fetch = LAZY)` — need `JOIN FETCH` to avoid N+1.
- `WaziApplication` already has `@EnableAsync`. It does NOT yet have `@EnableScheduling`.
- `application.yaml` has `spring.profiles.active: ${SPRING_PROFILES_ACTIVE:default}` — dev mode is active only when env var is `dev`, matching `StringUtils.isDevMode()`.
- Frontend: `LessonSummary` interface in `lesson.ts` does not yet have deadline fields. The `lesson-lists` component delegates card rendering to `<app-lesson-card>` — deadline badges go directly in `lesson-card.html`, not in `lesson-lists.html`. Teacher form uses plain `[(ngModel)]` two-way binding; `lessonData` object in `saveLesson()` is an inline object literal — new fields just get added there.
- Build: `mvnw.cmd compile` from `c:\Users\PC\ShuleConnect\backend`.

---

## Plan

- [ ] 1. Add deadline fields to `Lesson` entity.
      Add six fields after `points`: `private Instant assignmentDeadline;`, `private String assignmentTitle;`, `private Instant examDate;`, `private String examName;`, `private Boolean hasAssignment;`, `private Boolean hasExam;`. No annotation besides what Lombok provides — JPA will column-map them by default. Hibernate `ddl-auto: update` will add the columns on next boot.
      Files: `src/main/java/com/softkit/wazi/entities/Lesson.java`
      Verify: `.\mvnw.cmd compile` from `c:\Users\PC\ShuleConnect\backend` — exits 0.

- [ ] 2. Add the same six fields to `LessonDto`.
      Add after `learnerCompleted`: `private Instant assignmentDeadline;`, `private String assignmentTitle;`, `private Instant examDate;`, `private String examName;`, `private Boolean hasAssignment;`, `private Boolean hasExam;`. Because `LessonMapper` uses `ReportingPolicy.IGNORE`, MapStruct will auto-wire these at compile time — no mapper changes needed.
      Files: `src/main/java/com/softkit/wazi/model/LessonDto.java`
      Verify: `.\mvnw.cmd compile` exits 0.

- [ ] 3. Update `LessonService.updateLesson` to persist deadline fields.
      Inside the `JPAUpdateClause` block (after the `update.set(lesson.points, ...)` line), add:
      ```java
      update.set(lesson.hasAssignment, lessonDto.getHasAssignment());
      update.set(lesson.assignmentTitle, lessonDto.getAssignmentTitle());
      update.set(lesson.assignmentDeadline, lessonDto.getAssignmentDeadline());
      update.set(lesson.hasExam, lessonDto.getHasExam());
      update.set(lesson.examName, lessonDto.getExamName());
      update.set(lesson.examDate, lessonDto.getExamDate());
      ```
      The `createLesson` path calls `lessonMapper.toLessonEntity(lessonDto)` which auto-maps all matching fields — no change needed there.
      Files: `src/main/java/com/softkit/wazi/service/LessonService.java`
      Verify: `.\mvnw.cmd compile` exits 0.

- [ ] 4. Add JPQL queries to `LessonRepo`.
      Add these three query methods:
      ```java
      import java.time.Instant;
      import org.springframework.data.domain.Pageable;

      @Query("SELECT l FROM Lesson l WHERE l.hasAssignment = true AND l.assignmentDeadline BETWEEN :now AND :deadline")
      List<Lesson> findUpcomingAssignments(@Param("now") Instant now, @Param("deadline") Instant deadline);

      @Query("SELECT l FROM Lesson l WHERE l.hasExam = true AND l.examDate BETWEEN :now AND :examDate")
      List<Lesson> findUpcomingExams(@Param("now") Instant now, @Param("examDate") Instant examDate);

      @Query("SELECT l FROM Lesson l WHERE l.active = true ORDER BY l.createdAt DESC")
      List<Lesson> findLatestActiveLesson(Pageable pageable);
      ```
      `Pageable` is already imported in the file.
      Files: `src/main/java/com/softkit/wazi/repository/LessonRepo.java`
      Verify: `.\mvnw.cmd compile` exits 0.

- [ ] 5. Add phone-fetch query to `LearnerRepo`.
      Add one method:
      ```java
      @Query("SELECT l FROM Learner l JOIN FETCH l.appUser WHERE l.appUser.phoneNumber IS NOT NULL")
      List<Learner> findAllLearnersWithPhones();
      ```
      Files: `src/main/java/com/softkit/wazi/repository/LearnerRepo.java`
      Verify: `.\mvnw.cmd compile` exits 0.

- [ ] 6. Create `ReminderScheduler` component.
      Create a new file at `src/main/java/com/softkit/wazi/component/ReminderScheduler.java`:
      ```java
      package com.softkit.wazi.component;

      import com.softkit.wazi.entities.Lesson;
      import com.softkit.wazi.entities.Learner;
      import com.softkit.wazi.repository.LearnerRepo;
      import com.softkit.wazi.repository.LessonRepo;
      import com.softkit.wazi.service.ATService;
      import com.softkit.wazi.util.StringUtils;
      import jakarta.mail.MessagingException;
      import lombok.RequiredArgsConstructor;
      import lombok.extern.slf4j.Slf4j;
      import org.springframework.data.domain.PageRequest;
      import org.springframework.scheduling.annotation.Scheduled;
      import org.springframework.stereotype.Component;

      import java.time.Instant;
      import java.time.temporal.ChronoUnit;
      import java.util.List;

      @Component
      @RequiredArgsConstructor
      @Slf4j
      public class ReminderScheduler {
          private final LessonRepo lessonRepo;
          private final LearnerRepo learnerRepo;
          private final ATService atService;

          @Scheduled(cron = "0 0 8 * * *", zone = "Africa/Nairobi")
          public void dailyReminders() throws MessagingException {
              if (StringUtils.isDevMode()) {
                  log.info("DEV mode — skipping scheduled reminders");
                  return;
              }
              Instant now = Instant.now();
              List<Learner> learners = learnerRepo.findAllLearnersWithPhones();

              // Assignment reminders — due within next 24 hours
              List<Lesson> assignmentLessons = lessonRepo.findUpcomingAssignments(now, now.plus(24, ChronoUnit.HOURS));
              for (Lesson lesson : assignmentLessons) {
                  for (Learner learner : learners) {
                      String phone = learner.getAppUser().getPhoneNumber();
                      atService.sendAssignmentReminder(phone, lesson.getAssignmentTitle(), lesson.getAssignmentDeadline());
                  }
              }

              // Exam reminders — due within next 48 hours
              List<Lesson> examLessons = lessonRepo.findUpcomingExams(now, now.plus(48, ChronoUnit.HOURS));
              for (Lesson lesson : examLessons) {
                  for (Learner learner : learners) {
                      String phone = learner.getAppUser().getPhoneNumber();
                      atService.sendExamReminder(phone, lesson.getExamName(), lesson.getExamDate());
                  }
              }

              // Daily lesson broadcast — newest active lesson, first 100 chars of content
              List<Lesson> latest = lessonRepo.findLatestActiveLesson(PageRequest.of(0, 1));
              if (!latest.isEmpty()) {
                  Lesson daily = latest.get(0);
                  String summary = daily.getContent() != null
                          ? daily.getContent().replaceAll("<[^>]*>", "").substring(0, Math.min(100, daily.getContent().replaceAll("<[^>]*>", "").length()))
                          : "";
                  for (Learner learner : learners) {
                      String phone = learner.getAppUser().getPhoneNumber();
                      atService.sendDailyLesson(phone, daily.getName(), summary);
                  }
              }
              log.info("Daily reminders dispatched — {} learners, {} assignment lessons, {} exam lessons",
                      learners.size(), assignmentLessons.size(), examLessons.size());
          }
      }
      ```
      Files: `src/main/java/com/softkit/wazi/component/ReminderScheduler.java` (create)
      Verify: `.\mvnw.cmd compile` exits 0.

- [ ] 7. Add `@EnableScheduling` to `WaziApplication`.
      Add `import org.springframework.scheduling.annotation.EnableScheduling;` and the `@EnableScheduling` annotation directly below `@EnableAsync` on the class.
      Files: `src/main/java/com/softkit/wazi/WaziApplication.java`
      Verify: `.\mvnw.cmd compile` exits 0.

- [ ] 8. Add manual trigger endpoints to `LessonController`.
      Inject `ReminderScheduler` via `@RequiredArgsConstructor` (already on the class). Add two endpoints:
      ```java
      import com.softkit.wazi.component.ReminderScheduler;
      import jakarta.mail.MessagingException;

      private final ReminderScheduler reminderScheduler;

      @PostMapping("/reminders/trigger")
      public ResponseEntity<?> triggerReminders() throws MessagingException {
          reminderScheduler.dailyReminders();
          return ResponseEntity.ok("Reminders triggered");
      }

      @PostMapping("/daily/send")
      public ResponseEntity<?> sendDailyLesson() throws MessagingException {
          reminderScheduler.dailyReminders();
          return ResponseEntity.ok("Daily lesson SMS dispatched");
      }
      ```
      Files: `src/main/java/com/softkit/wazi/controller/LessonController.java`
      Verify: `.\mvnw.cmd compile` exits 0 (this is the final backend compile check).

- [ ] 9. Add deadline fields to `LessonSummary` interface.
      In `lesson.ts`, add four optional fields to `LessonSummary` after `locked?`:
      ```typescript
      assignmentDeadline?: string;   // ISO string from backend Instant
      assignmentTitle?: string;
      examDate?: string;
      examName?: string;
      hasAssignment?: boolean;
      hasExam?: boolean;
      ```
      Files: `src/app/kid/services/lesson/lesson.ts`
      Verify: `ng build` from `c:\Users\PC\ShuleConnect\frontend\learnplay` exits 0 (or type-check only: `npx tsc --noEmit`).

- [ ] 10. Update teacher lesson creation/edit form with deadline fields.
       In `manage-lessons-notes.ts`:
       - Add six component properties after `points`:
         ```typescript
         hasAssignment: boolean = false;
         assignmentTitle: string = '';
         assignmentDeadline: string = '';   // string for datetime-local input binding
         hasExam: boolean = false;
         examName: string = '';
         examDate: string = '';
         ```
       - In `saveLesson()`, extend `lessonData` to include:
         ```typescript
         hasAssignment: this.hasAssignment,
         assignmentTitle: this.hasAssignment ? this.assignmentTitle : null,
         assignmentDeadline: this.hasAssignment && this.assignmentDeadline ? new Date(this.assignmentDeadline).toISOString() : null,
         hasExam: this.hasExam,
         examName: this.hasExam ? this.examName : null,
         examDate: this.hasExam && this.examDate ? new Date(this.examDate).toISOString() : null,
         ```
       - In `resetForm()`, reset all six new properties to their defaults.
       - In `editLesson(lesson)`, populate all six properties from `lesson`:
         ```typescript
         this.hasAssignment = lesson.hasAssignment || false;
         this.assignmentTitle = lesson.assignmentTitle || '';
         this.assignmentDeadline = lesson.assignmentDeadline ? new Date(lesson.assignmentDeadline).toISOString().slice(0, 16) : '';
         this.hasExam = lesson.hasExam || false;
         this.examName = lesson.examName || '';
         this.examDate = lesson.examDate ? new Date(lesson.examDate).toISOString().slice(0, 16) : '';
         ```
       - Update `isLessonFormChanged` getter to also check the six new fields against `originalLesson`.
       - Update `loadLessons()` map to pass through `hasAssignment`, `assignmentTitle`, `assignmentDeadline`, `hasExam`, `examName`, `examDate` from the raw response object.

       In `manage-lessons-notes.html`, inside the `<form>`, add this block **after** the Points field div and **before** the Lesson Notes yellow card:
       ```html
       <!-- Assignment Deadline -->
       <div class="pb-[40px]">
         <div class="flex items-center gap-4 mb-3">
           <label class="block font-fredoka font-semibold text-[25px] leading-[20px] tracking-[-0.4px] text-green-700">Has Assignment?</label>
           <input type="checkbox" [(ngModel)]="hasAssignment" name="hasAssignment"
             class="w-6 h-6 rounded border-green-600 text-green-700 focus:ring-green-500 cursor-pointer">
         </div>
         <div *ngIf="hasAssignment" class="bg-green-50 border border-green-600 rounded-xl p-4 flex flex-col gap-4">
           <div>
             <label class="block font-fredoka font-semibold text-[20px] text-green-700 mb-1">Assignment Title *</label>
             <input type="text" [(ngModel)]="assignmentTitle" name="assignmentTitle" placeholder="e.g. Chapter 3 Exercise"
               class="w-full h-[60px] bg-white border-green-600 border-[2px] rounded-[20px] px-[20px] font-fredoka text-[20px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-green-500">
           </div>
           <div>
             <label class="block font-fredoka font-semibold text-[20px] text-green-700 mb-1">Deadline *</label>
             <input type="datetime-local" [(ngModel)]="assignmentDeadline" name="assignmentDeadline"
               class="w-full h-[60px] bg-white border-green-600 border-[2px] rounded-[20px] px-[20px] font-fredoka text-[20px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-green-500">
           </div>
         </div>
       </div>

       <!-- Exam Date -->
       <div class="pb-[40px]">
         <div class="flex items-center gap-4 mb-3">
           <label class="block font-fredoka font-semibold text-[25px] leading-[20px] tracking-[-0.4px] text-green-700">Has Exam?</label>
           <input type="checkbox" [(ngModel)]="hasExam" name="hasExam"
             class="w-6 h-6 rounded border-green-600 text-green-700 focus:ring-green-500 cursor-pointer">
         </div>
         <div *ngIf="hasExam" class="bg-green-50 border border-green-600 rounded-xl p-4 flex flex-col gap-4">
           <div>
             <label class="block font-fredoka font-semibold text-[20px] text-green-700 mb-1">Exam Name *</label>
             <input type="text" [(ngModel)]="examName" name="examName" placeholder="e.g. Mid-term Test"
               class="w-full h-[60px] bg-white border-green-600 border-[2px] rounded-[20px] px-[20px] font-fredoka text-[20px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-green-500">
           </div>
           <div>
             <label class="block font-fredoka font-semibold text-[20px] text-green-700 mb-1">Exam Date *</label>
             <input type="datetime-local" [(ngModel)]="examDate" name="examDate"
               class="w-full h-[60px] bg-white border-green-600 border-[2px] rounded-[20px] px-[20px] font-fredoka text-[20px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-green-500">
           </div>
         </div>
       </div>
       ```
       Files:
       - `src/app/teacher/components/manage-lessons-notes/manage-lessons-notes.ts`
       - `src/app/teacher/components/manage-lessons-notes/manage-lessons-notes.html`
       Verify: `ng build` exits 0.

- [ ] 11. Add deadline badges to the kid `lesson-card.html`.
       In `lesson-card.html`, inside the `<!-- INFO SECTION -->` div, add this block after the description comment block and before the `<!-- Footer Action -->` div:
       ```html
       <!-- Deadline badges -->
       <div class="flex flex-col gap-1 mt-1">
         <span *ngIf="lesson.hasAssignment && lesson.assignmentDeadline && isFuture(lesson.assignmentDeadline)"
           class="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-[11px] md:text-xs font-bold px-2 py-0.5 rounded-md">
           📝 Due: {{ formatDeadline(lesson.assignmentDeadline) }}
         </span>
         <span *ngIf="lesson.hasExam && lesson.examDate && isFuture(lesson.examDate)"
           class="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[11px] md:text-xs font-bold px-2 py-0.5 rounded-md">
           📋 Exam: {{ formatDeadline(lesson.examDate) }}
         </span>
       </div>
       ```
       In `lesson-card.ts`, add two helper methods to the class:
       ```typescript
       isFuture(dateStr: string): boolean {
         return new Date(dateStr) > new Date();
       }
       formatDeadline(dateStr: string): string {
         return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
       }
       ```
       Files:
       - `src/app/kid/reusable/lesson-card/lesson-card.html`
       - `src/app/kid/reusable/lesson-card/lesson-card.ts`
       Verify: `ng build` from `c:\Users\PC\ShuleConnect\frontend\learnplay` exits 0 with no TypeScript errors.
