package com.softkit.wazi.controller;

import com.softkit.wazi.model.GradeSubjectDetailsDto;
import com.softkit.wazi.model.GradeSubjectDto;
import com.softkit.wazi.service.GradeSubjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/grade-subject")
@RequiredArgsConstructor
public class GradeSubjectController {
    private final GradeSubjectService gradeSubjectService;

    @PostMapping("")
    public ResponseEntity<?> createGradeSubject(@RequestBody GradeSubjectDto gradeSubjectDto) {
        return gradeSubjectService.createGradeSubject(gradeSubjectDto);
    }

    @GetMapping("/subjects/byGrade/{gradeId}")
    public ResponseEntity<?> getGradeSubjectByGrade(@PathVariable String gradeId) {
        List<GradeSubjectDetailsDto> data= gradeSubjectService.getGradeSubjectByGradeId(gradeId);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/topics/bySubject/{gradeSubjectId}")
    public ResponseEntity<?> getTopicsByGradeSubject(@PathVariable String gradeSubjectId) {
        return gradeSubjectService.getTopicsByGradeSubjectId(gradeSubjectId);

    }
}
