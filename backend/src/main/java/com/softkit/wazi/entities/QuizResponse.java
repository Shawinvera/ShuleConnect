package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Table(name = "quiz_responses")
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Builder
public class QuizResponse {
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private String id;

    @Column(name = "creation_date", updatable = false, nullable = false)
    private Instant createdAt;

    private String sessionId;
    private String phoneNumber;
    private String quizCode;
    private String answer;

    @PrePersist
    protected void onCreate() {
        this.id = UuidGenerator.generateEntityUuid("quiz-resp");
        this.createdAt = Instant.now();
    }
}
