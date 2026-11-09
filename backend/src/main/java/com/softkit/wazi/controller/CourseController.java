package com.softkit.wazi.controller;

import com.softkit.wazi.model.CourseDto;
import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.service.CourseService;
import com.softkit.wazi.util.ResponseUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/courses")
@RequiredArgsConstructor
public class CourseController {
    private final CourseService courseService;
    @PostMapping("")
    public ResponseEntity<?> postCourseDto(
            HttpServletRequest request,
            @RequestBody CourseDto courseDto) {
        return courseService.postCourseDto(request, courseDto);
    }

    @PutMapping("/update")
    public ResponseEntity<?> updateCourse(
            HttpServletRequest request,
            @RequestBody CourseDto courseDto) {
        CustomResponse customResponse = courseService.updateCourse(request, courseDto);
        return ResponseUtils.createResponse(customResponse);
    }

    @GetMapping("/byId/{courseId}")
    public ResponseEntity<CourseDto> getCourseDto(@PathVariable String courseId) {
        return courseService.getCourseDto(courseId);
    }

    @GetMapping("/all")
    public ResponseEntity<List<CourseDto>> getAllCourseDto() {
        return courseService.getAllCourseDto();
    }

    @GetMapping("/fetchByCountryCode")
    public ResponseEntity<?> fetchUserCourseByCountryCode(
            HttpServletRequest request,
            @RequestParam(name = "countryCode") String countryCode,
            @RequestParam(name = "status", required = false, defaultValue = "1") Integer status) {
        return courseService.fetchCourseByCountryCode(request, countryCode, status);
    }
}
