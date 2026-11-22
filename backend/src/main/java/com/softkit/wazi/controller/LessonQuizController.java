package com.softkit.wazi.controller;

import com.softkit.wazi.model.LessonQuizCreateDto;
import com.softkit.wazi.model.LessonQuizLearnerDto;
import com.softkit.wazi.model.LessonQuizLessonOptionDto;
import com.softkit.wazi.model.LessonQuizSubmissionDto;
import com.softkit.wazi.model.LessonQuizSummaryDto;
import com.softkit.wazi.service.LessonQuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/lesson-quizzes")
@RequiredArgsConstructor
public class LessonQuizController {
    private final LessonQuizService lessonQuizService;

    @GetMapping("/lessons")
    public List<LessonQuizLessonOptionDto> getLessonOptions() {
        return lessonQuizService.getLessonOptions();
    }

    @GetMapping
    public List<LessonQuizSummaryDto> getQuizzes() {
        return lessonQuizService.getQuizzes();
    }

    @PostMapping
    public ResponseEntity<?> createQuiz(@RequestBody LessonQuizCreateDto request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(lessonQuizService.createQuiz(request));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/lesson/{lessonId}")
    public ResponseEntity<LessonQuizLearnerDto> getQuizForLesson(
            @PathVariable String lessonId,
            @RequestParam(required = false) String learnerId
    ) {
        LessonQuizLearnerDto quiz = lessonQuizService.getQuizForLesson(lessonId, learnerId);
        return quiz == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(quiz);
    }

    @PostMapping("/{quizId}/attempts")
    public ResponseEntity<?> submit(
            @PathVariable String quizId,
            @RequestBody LessonQuizSubmissionDto request
    ) {
        try {
            return ResponseEntity.ok(lessonQuizService.submit(quizId, request));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
