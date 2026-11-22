package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "lesson_quizzes",
        uniqueConstraints = @UniqueConstraint(name = "unique_lesson_quiz", columnNames = "lesson_id")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonQuiz {
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private String id;

    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<LessonQuizQuestion> questions = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.id = UuidGenerator.generateEntityUuid("lesson-quiz");
        this.createdAt = Instant.now();
    }
}
