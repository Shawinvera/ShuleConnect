package com.softkit.wazi.repository;

import com.softkit.wazi.entities.LessonQuiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LessonQuizRepo extends JpaRepository<LessonQuiz, String> {
    boolean existsByLessonId(String lessonId);

    @Query("SELECT q FROM LessonQuiz q JOIN FETCH q.lesson ORDER BY q.createdAt DESC")
    List<LessonQuiz> findAllWithLesson();

    @Query("SELECT DISTINCT q FROM LessonQuiz q JOIN FETCH q.lesson LEFT JOIN FETCH q.questions WHERE q.lesson.id = :lessonId")
    Optional<LessonQuiz> findForLesson(@Param("lessonId") String lessonId);

    @Query("SELECT DISTINCT q FROM LessonQuiz q LEFT JOIN FETCH q.questions WHERE q.id = :quizId")
    Optional<LessonQuiz> findWithQuestions(@Param("quizId") String quizId);
}
