package com.softkit.wazi.repository;

import com.softkit.wazi.entities.QuizResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface QuizResponseRepo extends JpaRepository<QuizResponse, String> {

    @Query("SELECT q FROM QuizResponse q WHERE q.sessionId = :sessionId")
    List<QuizResponse> findBySessionId(@Param("sessionId") String sessionId);

    @Query("SELECT q FROM QuizResponse q WHERE q.phoneNumber = :phoneNumber ORDER BY q.createdAt DESC")
    List<QuizResponse> findByPhoneNumber(@Param("phoneNumber") String phoneNumber);

    @Query("SELECT q FROM QuizResponse q WHERE q.quizCode = :quizCode ORDER BY q.createdAt DESC")
    List<QuizResponse> findByQuizCode(@Param("quizCode") String quizCode);
}
