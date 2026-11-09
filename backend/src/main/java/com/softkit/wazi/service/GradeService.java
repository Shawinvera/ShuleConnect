package com.softkit.wazi.service;

import com.querydsl.jpa.impl.JPAUpdateClause;
import com.softkit.wazi.entities.Course;
import com.softkit.wazi.entities.Grade;
import com.softkit.wazi.entities.QGrade;
import com.softkit.wazi.mapper.GradeMapper;
import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.model.GradeDto;
import com.softkit.wazi.repository.CourseRepo;
import com.softkit.wazi.repository.GradeRepo;
import com.softkit.wazi.util.ResponseUtils;
import jakarta.persistence.EntityManager;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GradeService {
    private final GradeMapper gradeMapper;
    private final GradeRepo gradeRepo;
    private final CourseRepo courseRepo;
    private final EntityManager entityManager;

    public ResponseEntity<?> createGrade(@Valid GradeDto gradeDto) {
        try {
            String gradeName = gradeDto.getName().trim().toUpperCase();
            gradeDto.setName(gradeName);
//            Optional<Grade> _grade = gradeRepo.findByNameIgnoreCaseAndCourse_Id(gradeName, gradeDto.getCourseId());
//            if (_grade.isPresent()) {
//                return ResponseEntity.badRequest().body("Grade already created");
//            }
//
            Grade gradeEntity = gradeMapper.toGradeEntity(gradeDto);
//            Optional<Course> _courseRef = courseRepo.findById(gradeDto.getCourseId());
//            if (_courseRef.isEmpty()) {
//                return ResponseEntity.badRequest().build();
//            }
            Course courseRef = new Course();
            courseRef.setId(gradeDto.getCourseId());
            gradeEntity.setCourse(courseRef);
            gradeRepo.save(gradeEntity);

            return ResponseUtils.entryCreatedResponse(gradeEntity.getId(), "Grade");
        } catch (Exception e) {
            String errMessage = e.getMessage() != null ? e.getMessage() : "An error occurred while saving the grade";
            if (errMessage.contains("unique_course_grade_name")) {
                return ResponseUtils.duplicateErrorResponse();
            }
            return ResponseUtils.badRequestErrorResponse(errMessage);
        }
    }

    public ResponseEntity<List<GradeDto>> getCourseGrades(String courseId) {
        List<Grade> gradeEntities = gradeRepo.findByCourseId(courseId);
        List<GradeDto> gradeDtos = gradeEntities.stream()
                .map(gradeMapper::toGradeDto)
                .peek(g-> g.setCourseId(courseId))
                .toList();
        return ResponseEntity.ok(gradeDtos);
    }

    @Transactional
    public CustomResponse updateGrade(@Valid GradeDto gradeDto) {
        CustomResponse resp = CustomResponse.builder()
                .errorMessage("Grade update failed")
                .successful(false)
                .build();

        QGrade grade = QGrade.grade;
        JPAUpdateClause update = new JPAUpdateClause(entityManager, grade);
        update.set(grade.name, gradeDto.getName().trim());
        update.set(grade.description, gradeDto.getDescription());
        update.set(grade.course, Course.builder().id(gradeDto.getCourseId()).build());
        update.set(grade.active, gradeDto.getActive());
        update.where(grade.id.eq(gradeDto.getId()));
        long affectedRows = update.execute();
        if (affectedRows > 0) {
            resp.setSuccessful(true);
            resp.setErrorMessage("Grade update successful");
        }
        return resp;
    }
}
