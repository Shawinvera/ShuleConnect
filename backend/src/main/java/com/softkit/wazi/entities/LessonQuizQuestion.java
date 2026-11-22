package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "lesson_quiz_questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonQuizQuestion {
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private String id;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String prompt;

    @Column(name = "option_a", nullable = false, columnDefinition = "TEXT")
    private String optionA;

    @Column(name = "option_b", nullable = false, columnDefinition = "TEXT")
    private String optionB;

    @Column(name = "option_c", nullable = false, columnDefinition = "TEXT")
    private String optionC;

    @Column(name = "option_d", nullable = false, columnDefinition = "TEXT")
    private String optionD;

    @Column(name = "correct_option_index", nullable = false)
    private Integer correctOptionIndex;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_id", nullable = false)
    private LessonQuiz quiz;

    @PrePersist
    protected void onCreate() {
        this.id = UuidGenerator.generateEntityUuid("quiz-question");
    }
}
