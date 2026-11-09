package com.softkit.wazi.controller;

import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.model.GradeDto;
import com.softkit.wazi.model.SubjectDto;
import com.softkit.wazi.service.GradeService;
import com.softkit.wazi.service.SubjectService;
import com.softkit.wazi.util.ResponseUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/subject")
@RequiredArgsConstructor
public class SubjectController {
    private final SubjectService subjectService;

    @PostMapping("")
    public ResponseEntity<?> createSubject(@Valid @RequestBody SubjectDto subjectDto) {
        return subjectService.createSubject(subjectDto);
    }

    @PostMapping("/update")
    public ResponseEntity<?> updateSubject(@Valid @RequestBody SubjectDto subjectDto) {
        CustomResponse resp = subjectService.updateSubject(subjectDto);
        return ResponseUtils.createResponse(resp);
    }

    @GetMapping("/fetchByCourse/{courseId}")
    public ResponseEntity<List<SubjectDto>> getCourseSubjects(@PathVariable String courseId) {
        return subjectService.getCourseSubjects(courseId);
    }
}
