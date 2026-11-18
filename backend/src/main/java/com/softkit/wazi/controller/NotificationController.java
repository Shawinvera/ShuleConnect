package com.softkit.wazi.controller;

import com.softkit.wazi.entities.AppNotification;
import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.service.NotificationService;
import com.softkit.wazi.util.RequestContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/my")
    public ResponseEntity<List<AppNotification>> getMyNotifications() {
        String userId = RequestContext.getThreadData().getUserId();
        List<AppNotification> notifications = notificationService.getNotificationsForUser(userId);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/my/unread-count")
    public ResponseEntity<CustomResponse> getUnreadCount() {
        String userId = RequestContext.getThreadData().getUserId();
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(CustomResponse.builder()
                .successful(true)
                .data(Map.of("count", count))
                .build());
    }

    @PostMapping("/mark-read/{id}")
    public ResponseEntity<CustomResponse> markOneRead(@PathVariable String id) {
        notificationService.markOneRead(id);
        return ResponseEntity.ok(CustomResponse.builder().successful(true).build());
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<CustomResponse> markAllRead() {
        String userId = RequestContext.getThreadData().getUserId();
        notificationService.markAllRead(userId);
        return ResponseEntity.ok(CustomResponse.builder().successful(true).build());
    }
}
