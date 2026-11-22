package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "lesson_quiz_attempts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonQuizAttempt {
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private String id;

    @Column(name = "submitted_at", updatable = false, nullable = false)
    private Instant submittedAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_id", nullable = false)
    private LessonQuiz quiz;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "learner_id", nullable = false)
    private Learner learner;

    @Column(nullable = false)
    private Integer score;

    @Column(name = "question_count", nullable = false)
    private Integer questionCount;

    @Column(nullable = false)
    private Integer percentage;

    @PrePersist
    protected void onCreate() {
        this.id = UuidGenerator.generateEntityUuid("quiz-attempt");
        this.submittedAt = Instant.now();
    }
}
