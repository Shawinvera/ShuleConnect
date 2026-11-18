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
                .successful(true)
                .data(count + " teacher(s) notified")
                .build());
    }

    @PostMapping("/notify/admins")
    public ResponseEntity<CustomResponse> notifyAdmins(@RequestBody StaffNotificationDto dto) throws MessagingException {
        int count = staffNotificationService.notifyAllAdmins(dto.getMessage());
        return ResponseEntity.ok(CustomResponse.builder()
                .successful(true)
                .data(count + " admin(s) notified")
                .build());
    }

    @PostMapping("/notify/all")
    public ResponseEntity<CustomResponse> notifyAll(@RequestBody StaffNotificationDto dto) throws MessagingException {
        int count = staffNotificationService.notifyAllStaff(dto.getMessage());
        return ResponseEntity.ok(CustomResponse.builder()
                .successful(true)
                .data(count + " staff member(s) notified")
                .build());
    }

    @PostMapping("/notify/individual")
    public ResponseEntity<CustomResponse> notifyIndividual(@RequestBody StaffNotificationDto dto) throws MessagingException {
        staffNotificationService.notifyIndividual(dto.getPhoneNumber(), dto.getMessage());
        return ResponseEntity.ok(CustomResponse.builder()
                .successful(true)
                .data("Message sent to " + dto.getPhoneNumber())
                .build());
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
