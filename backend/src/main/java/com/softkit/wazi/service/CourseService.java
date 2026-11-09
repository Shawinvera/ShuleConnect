package com.softkit.wazi.service;

import com.querydsl.jpa.impl.JPAUpdateClause;
import com.softkit.wazi.entities.Course;
import com.softkit.wazi.entities.QCourse;
import com.softkit.wazi.mapper.CourseMapper;
import com.softkit.wazi.model.CourseDto;
import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.repository.CourseRepo;
import com.softkit.wazi.util.ResponseUtils;
import com.softkit.wazi.util.StringUtils;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CourseService {
    private final CourseRepo courseRepo;
    private final CourseMapper courseMapper;
    private final EntityManager entityManager;

    public ResponseEntity<?> postCourseDto(
            HttpServletRequest request,
            @Valid @RequestBody CourseDto courseDto) {

        try {
            String courseTitle = courseDto.getTitle().trim().toUpperCase();
            courseDto.setTitle(courseTitle);
            String countryCode = courseDto.getCountryCode().trim().toUpperCase();
            courseDto.setCountryCode(countryCode);

            Course courseEntity = courseMapper.toEntity(courseDto);
            courseRepo.saveAndFlush(courseEntity);

            return ResponseUtils.entryCreatedResponse(courseEntity.getId(), "Course");
        } catch (Exception e) {
            String errMessage = e.getMessage() != null ? e.getMessage() : "An error occurred while saving the course";
            if (errMessage.contains("unique_course_title")) {
                return ResponseUtils.duplicateErrorResponse();
            }
            return ResponseUtils.badRequestErrorResponse(errMessage);
        }
    }

    public ResponseEntity<CourseDto> getCourseDto(String courseId) {
        Course courseEntity = courseRepo.findById(courseId).orElseThrow(() -> new RuntimeException("Course not found"));
        CourseDto courseDto = courseMapper.toDto(courseEntity);
        return ResponseEntity.ok(courseDto);
    }

    //fetch all courses
    public ResponseEntity<List<CourseDto>> getAllCourseDto() {
        List<Course> courseEntities = courseRepo.findAll();
        List<CourseDto> courseDtos = courseEntities.stream()
                .map(courseMapper::toDto)
                .toList();
        return ResponseEntity.ok(courseDtos);
    }

    public ResponseEntity<?> fetchCourseByCountryCode(HttpServletRequest request, String countryCode, Integer status) {
        List<Course> courses = courseRepo.findByCountryCodeIgnoreCase(countryCode);
        List<CourseDto> allCourses = courses.stream().map(courseMapper::toDto).toList();
        List<CourseDto> filteredCourses;
        if (status==1){
            filteredCourses = allCourses.stream().filter(CourseDto::getActive).toList();
        }else if (status==2){
            filteredCourses = allCourses.stream().filter(courseDto -> !courseDto.getActive()).toList();
        }else  {
            filteredCourses = allCourses;
        }
        return ResponseEntity.ok(filteredCourses);
    }

    @Transactional
    public CustomResponse updateCourse(HttpServletRequest request, CourseDto courseDto) {
        CustomResponse resp= CustomResponse.builder()
                .successful(false)
                .errorMessage("Failed to update course")
                .build();
        QCourse course = QCourse.course;
        JPAUpdateClause update = new JPAUpdateClause(entityManager, course);
        if (!StringUtils.isNullOrEmpty(courseDto.getTitle())){
            update.set(course.title, courseDto.getTitle());
        }
        if (!StringUtils.isNullOrEmpty(courseDto.getCountryCode())){
            update.set(course.countryCode, courseDto.getCountryCode());
        }
        if (courseDto.getActive() != null){
            update.set(course.active, courseDto.getActive());
        }
        if (!StringUtils.isNullOrEmpty(courseDto.getDescription())){
            update.set(course.description, courseDto.getDescription());
        }
        if (!StringUtils.isNullOrEmpty(courseDto.getShortCode())){
            update.set(course.shortCode, courseDto.getShortCode());
        }
        update.where(course.id.eq(courseDto.getId()));
        long affectedRows = update.execute();
        if (affectedRows > 0) {
            resp.setSuccessful(true);
            resp.setErrorMessage(null);
            resp.setData("Course updated successfully");

        }
        return resp;
    }
}
