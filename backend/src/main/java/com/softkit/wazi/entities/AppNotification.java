package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import lombok.*;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;

@Table(name = "app_notifications")
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Builder
@Slf4j
public class AppNotification {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    private String type;

    @Builder.Default
    private Boolean isRead = false;

    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.id = UuidGenerator.generateEntityUuid("notif");
        this.createdAt = Instant.now();
        if (this.isRead == null) {
            this.isRead = false;
        }
    }
}
