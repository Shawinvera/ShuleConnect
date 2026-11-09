package com.softkit.wazi.controller;

import com.softkit.wazi.model.CourseDto;
import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.model.GradeDto;
import com.softkit.wazi.service.CourseService;
import com.softkit.wazi.service.GradeService;
import com.softkit.wazi.util.ResponseUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/grade")
@RequiredArgsConstructor
public class GradeController {
    private final GradeService gradeService;

    @PostMapping("")
    public ResponseEntity<?> createGrade(@Valid @RequestBody GradeDto gradeDto) {
        return gradeService.createGrade(gradeDto);
    }

    @PutMapping("/update")
    public ResponseEntity<?> updateGrade(@Valid @RequestBody GradeDto gradeDto) {
        CustomResponse resp = gradeService.updateGrade(gradeDto);
        return ResponseUtils.createResponse(resp);
    }

    @GetMapping("/fetchByCourse/{courseId}")
    public ResponseEntity<List<GradeDto>> getCourseGrades(@PathVariable String courseId) {
        return gradeService.getCourseGrades(courseId);

    }
}
