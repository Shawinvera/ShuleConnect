package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Table(
        name = "learner_lesson_tracker",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "unique_learner_lesson_tracker",
                        columnNames = {"learner_id", "lesson_id"}
                )
        }
)
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Builder
public class LearnerLessonTracker {
    @Id
    private String id;
    private Instant completedAt;
    private String userTimezone;
    @ManyToOne
    @JoinColumn(
            name = "learner_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_tracker_learner_id")
    )
    private Learner learner;
    @ManyToOne
    @JoinColumn(
            name = "lesson_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_tracker_lesson_id")
    )
    private Lesson lesson;

    @PrePersist
    protected void onCreate(){
        this.id = UuidGenerator.generateEntityUuid("lesson-tracker");
        this.completedAt = Instant.now();
    }
}