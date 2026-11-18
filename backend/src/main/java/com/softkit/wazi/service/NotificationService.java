package com.softkit.wazi.service;

import com.softkit.wazi.entities.AppNotification;
import com.softkit.wazi.entities.AppUser;
import com.softkit.wazi.entities.Learner;
import com.softkit.wazi.repository.AppNotificationRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final AppNotificationRepo appNotificationRepo;

    public void saveNotification(String userId, String title, String message, String type) {
        try {
            AppNotification notification = AppNotification.builder()
                    .userId(userId)
                    .title(title)
                    .message(message)
                    .type(type)
                    .isRead(false)
                    .build();
            appNotificationRepo.save(notification);
            log.debug("Saved in-app notification for user {}: [{}] {}", userId, type, title);
        } catch (Exception e) {
            log.error("Failed to save notification for user {}: {}", userId, e.getMessage());
        }
    }

    public void saveNotificationsForUsers(List<AppUser> users, String title, String message, String type) {
        for (AppUser user : users) {
            saveNotification(user.getId(), title, message, type);
        }
    }

    public void saveNotificationsForLearnerUsers(List<Learner> learners, String title, String message, String type) {
        for (Learner learner : learners) {
            if (learner.getAppUser() != null) {
                saveNotification(learner.getAppUser().getId(), title, message, type);
            }
        }
    }

    public List<AppNotification> getNotificationsForUser(String userId) {
        return appNotificationRepo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(String userId) {
        return appNotificationRepo.countByUserIdAndIsReadFalse(userId);
    }

    public void markAllRead(String userId) {
        appNotificationRepo.markAllReadByUserId(userId);
    }

    public void markOneRead(String notificationId) {
        appNotificationRepo.markReadById(notificationId);
    }
}
