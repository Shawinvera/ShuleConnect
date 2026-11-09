package com.softkit.wazi.controller;

import com.softkit.wazi.model.*;
import com.softkit.wazi.service.SubTopicService;
import com.softkit.wazi.service.LessonService;
import com.softkit.wazi.util.ResponseUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/lesson")
@RequiredArgsConstructor
public class LessonController {
    private final LessonService lessonService;

    @PostMapping("")
    public ResponseEntity<?> createLesson(@RequestBody LessonDto subTopicDto) {
        return lessonService.createLesson(subTopicDto);
    }

    @PutMapping("/update")
    public ResponseEntity<?> updateLesson(@Valid @RequestBody LessonDto subTopicDto) {
        CustomResponse resp= lessonService.updateLesson(subTopicDto);
        return ResponseUtils.createResponse(resp);
    }

    @GetMapping("/fetch/bySubTopicId/{subTopicId}")
    public ResponseEntity<?> getLessonsBySubTopicId(
            @PathVariable String subTopicId,
            @RequestParam(required = false) String learnerId
    ) {
        List<LessonDto> lessons = lessonService.findLessonsBySubtopicId(subTopicId, learnerId);
        return ResponseEntity.ok(lessons);
    }

    @GetMapping("/bySubject/{subjectId}")
    public ResponseEntity<?> getLessonsBySubject(
            @PathVariable String subjectId,
            @RequestParam(required = false) String learnerId
            ) {
        List<SubjectLessonDto> lessons= lessonService.fetchLessonsBySubjectId(subjectId, learnerId);

        return  ResponseEntity.ok(lessons);
    }

    @PostMapping("/markComplete")
    public ResponseEntity<?> markComplete(
            HttpServletRequest request,
            @RequestBody LessonTrackerDto lessonTrackerDto
            ) {
        LessonTrackerDto resp = lessonService.markLessonComplete(lessonTrackerDto);

        return  ResponseEntity.ok(resp);
    }

    @GetMapping("/byGradeSubject")
    public ResponseEntity<?> getLessonsByGradeSubject(
            @RequestParam String gradeSubjectId,
            @RequestParam String learnerId
    ) {
        List<SubjectLessonDto> lessons= lessonService.lessonFetch(gradeSubjectId, learnerId);
        return  ResponseEntity.ok(lessons);
    }
}
