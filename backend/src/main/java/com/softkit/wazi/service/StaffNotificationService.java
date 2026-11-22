package com.softkit.wazi.service;

import com.softkit.wazi.entities.AppUser;
import com.softkit.wazi.entities.Learner;
import com.softkit.wazi.model.AppUserDto;
import com.softkit.wazi.repository.AppUserRepo;
import com.softkit.wazi.repository.LearnerRepo;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StaffNotificationService {

    private final AppUserRepo appUserRepo;
    private final ATService atService;
    private final LearnerRepo learnerRepo;
    private final NotificationService notificationService;

    private static final String PREFIX = "ShuleConnect: ";

    public int notifyAllTeachers(String message) throws MessagingException {
        List<AppUser> teachers = appUserRepo.findActiveUsersByRole("TEACHER");
        List<String> phones = teachers.stream()
                .map(AppUser::getPhoneNumber)
                .collect(Collectors.toList());
        if (!phones.isEmpty()) {
            atService.sendBulkSms(phones, PREFIX + message);
        }
        notificationService.saveNotificationsForUsers(teachers, "School Notification", PREFIX + message, "SMS");
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
        notificationService.saveNotificationsForUsers(admins, "School Notification", PREFIX + message, "SMS");
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
        appUserRepo.findByPhoneNumber(phoneNumber).ifPresent(user ->
            notificationService.saveNotification(user.getId(), "Direct Message", PREFIX + message, "SMS")
        );
        log.info("Sent individual notification to {}", phoneNumber);
    }

    public int notifyAllLearners(String message) throws MessagingException {
        List<Learner> learners = learnerRepo.findAllLearnersWithPhones();
        List<String> phones = learners.stream()
                .map(l -> l.getAppUser().getPhoneNumber())
                .filter(p -> p != null && !p.isBlank())
                .distinct()
                .collect(Collectors.toList());
        if (!phones.isEmpty()) {
            atService.sendBulkSms(phones, PREFIX + message);
        }
        notificationService.saveNotificationsForLearnerUsers(learners, "School Notification", PREFIX + message, "SMS");
        log.info("Notified {} learner(s) via SMS", phones.size());
        return phones.size();
    }

    public int notifyAllGuardians(String message) throws MessagingException {
        List<AppUser> guardians = appUserRepo.findActiveUsersByRole("GUARDIAN");
        List<String> phones = guardians.stream()
                .map(AppUser::getPhoneNumber)
                .filter(p -> p != null && !p.isBlank())
                .collect(Collectors.toList());
        if (!phones.isEmpty()) {
            atService.sendBulkSms(phones, PREFIX + message);
        }
        notificationService.saveNotificationsForUsers(guardians, "School Notification", PREFIX + message, "SMS");
        log.info("Notified {} guardian(s) via SMS", phones.size());
        return phones.size();
    }

    public int notifyEveryone(String message) throws MessagingException {
        int learners  = notifyAllLearners(message);
        int guardians = notifyAllGuardians(message);
        int teachers  = notifyAllTeachers(message);
        int total = learners + guardians + teachers;
        log.info("Broadcast sent to {} recipients (learners:{} guardians:{} teachers:{})",
                total, learners, guardians, teachers);
        return total;
    }

    public void saveVoiceBroadcastNotifications(List<String> phoneNumbers, String message) {
        if (phoneNumbers == null || phoneNumbers.isEmpty()) {
            return;
        }

        List<AppUser> recipients = appUserRepo.findActiveUsersByPhoneNumbers(phoneNumbers);
        notificationService.saveNotificationsForUsers(
                recipients, "Voice Announcement", message, "ANNOUNCEMENT");
    }

    public List<AppUserDto> getTeachers() {
        return appUserRepo.findActiveUsersByRole("TEACHER")
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<AppUserDto> getAdmins() {
        return appUserRepo.findActiveUsersByRole("ADMIN")
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<AppUserDto> getGuardians() {
        return appUserRepo.findActiveUsersByRole("GUARDIAN")
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
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
