package com.softkit.wazi.component;

import com.softkit.wazi.entities.Learner;
import com.softkit.wazi.entities.Lesson;
import com.softkit.wazi.repository.LearnerRepo;
import com.softkit.wazi.repository.LessonRepo;
import com.softkit.wazi.service.ATService;
import com.softkit.wazi.service.NotificationService;
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
    private final NotificationService notificationService;

    @Scheduled(cron = "0 0 8 * * *", zone = "Africa/Nairobi")
    public void dailyReminders() throws MessagingException {
        if (StringUtils.isDevMode()) {
            log.info("DEV mode - skipping daily reminders");
            return;
        }

        Instant now = Instant.now();
        List<Learner> learners = learnerRepo.findAllLearnersWithPhones();

        // Assignment reminders — due within the next 24 hours
        List<Lesson> upcomingAssignments = lessonRepo.findUpcomingAssignments(now, now.plus(24, ChronoUnit.HOURS));
        for (Lesson lesson : upcomingAssignments) {
            for (Learner learner : learners) {
                String phone = learner.getAppUser().getPhoneNumber();
                atService.sendAssignmentReminder(phone, lesson.getAssignmentTitle(), lesson.getAssignmentDeadline());
                notificationService.saveNotification(
                        learner.getAppUser().getId(),
                        "Assignment Due",
                        "Assignment due: " + lesson.getAssignmentTitle(),
                        "REMINDER"
                );
            }
        }

        // Exam reminders — due within the next 48 hours
        List<Lesson> upcomingExams = lessonRepo.findUpcomingExams(now, now.plus(48, ChronoUnit.HOURS));
        for (Lesson lesson : upcomingExams) {
            for (Learner learner : learners) {
                String phone = learner.getAppUser().getPhoneNumber();
                atService.sendExamReminder(phone, lesson.getExamName(), lesson.getExamDate());
                notificationService.saveNotification(
                        learner.getAppUser().getId(),
                        "Exam Reminder",
                        "Exam: " + lesson.getExamName(),
                        "REMINDER"
                );
            }
        }

        // Daily lesson summary — most recent active lesson
        List<Lesson> latestLessons = lessonRepo.findLatestActiveLesson(PageRequest.of(0, 1));
        if (!latestLessons.isEmpty()) {
            Lesson latest = latestLessons.get(0);
            String rawContent = latest.getContent() != null ? latest.getContent() : "";
            String summary = rawContent.replaceAll("<[^>]*>", "");
            if (summary.length() > 100) {
                summary = summary.substring(0, 100);
            }
            String name = latest.getName();
            for (Learner learner : learners) {
                String phone = learner.getAppUser().getPhoneNumber();
                atService.sendDailyLesson(phone, name, summary);
                notificationService.saveNotification(
                        learner.getAppUser().getId(),
                        "Today's Lesson",
                        name + ": " + summary,
                        "LESSON"
                );
            }
        }
    }
}
