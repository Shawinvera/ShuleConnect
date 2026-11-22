package com.softkit.wazi.repository;

import com.softkit.wazi.entities.LessonQuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface LessonQuizAttemptRepo extends JpaRepository<LessonQuizAttempt, String> {
    @Query("SELECT COUNT(a) FROM LessonQuizAttempt a WHERE a.quiz.id = :quizId AND a.learner.id = :learnerId")
    long countByQuizAndLearner(@Param("quizId") String quizId, @Param("learnerId") String learnerId);

    Optional<LessonQuizAttempt> findFirstByQuiz_IdAndLearner_IdOrderBySubmittedAtDesc(
            String quizId,
            String learnerId
    );

}
