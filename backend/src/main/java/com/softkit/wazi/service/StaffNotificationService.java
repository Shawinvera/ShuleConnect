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
