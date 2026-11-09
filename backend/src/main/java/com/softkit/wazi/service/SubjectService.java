package com.softkit.wazi.service;

import com.querydsl.jpa.impl.JPAUpdateClause;
import com.softkit.wazi.entities.Course;
import com.softkit.wazi.entities.QSubject;
import com.softkit.wazi.entities.Subject;
import com.softkit.wazi.mapper.SubjectMapper;
import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.model.SubjectDto;
import com.softkit.wazi.repository.CourseRepo;
import com.softkit.wazi.repository.SubjectRepo;
import com.softkit.wazi.util.ResponseUtils;
import com.softkit.wazi.util.StringUtils;
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
public class SubjectService {
    private final SubjectMapper subjectMapper;
    private final SubjectRepo subjectRepo;
    private final EntityManager entityManager;

    public ResponseEntity<?> createSubject(@Valid SubjectDto subjectDto) {
        try {
            String subjectName = subjectDto.getName().trim();
            subjectDto.setName(subjectName);

            Subject subjectEntity = subjectMapper.toSubjectEntity(subjectDto);
            Course courseRef = new Course();
            courseRef.setId(subjectDto.getCourseId());

            subjectEntity.setCourse(courseRef);
            subjectRepo.save(subjectEntity);

            return ResponseUtils.entryCreatedResponse(subjectEntity.getId(), "Subject");
        } catch (Exception e) {
            String errMessage = e.getMessage() != null ? e.getMessage() : "An error occurred while saving the subject";
            if (errMessage.contains("unique_course_subject_name")) {
                return ResponseUtils.duplicateErrorResponse();
            }
            return ResponseUtils.badRequestErrorResponse(errMessage);

        }
    }

    public ResponseEntity<List<SubjectDto>> getCourseSubjects(String courseId) {
        List<Subject> subjectEntityList = subjectRepo.findByCourseId(courseId);
        List<SubjectDto> subjectDtoList = subjectEntityList.stream()
                .map(subjectMapper::toSubjectDto)
                .peek(s -> s.setCourseId(courseId))
                .toList();
        return ResponseEntity.ok().body(subjectDtoList);
    }

    @Transactional
    public CustomResponse updateSubject(@Valid SubjectDto subjectDto) {
        CustomResponse resp = CustomResponse.builder()
                .successful(false)
                .errorMessage("Subject update failed")
                .build();

        QSubject qSubject = QSubject.subject;
        JPAUpdateClause update = new JPAUpdateClause(entityManager,  qSubject);
        if (!StringUtils.isNullOrEmpty(subjectDto.getName())) {
            update.set(qSubject.name, subjectDto.getName().trim());
        }
        update.set(qSubject.description, subjectDto.getDescription().trim());
        update.set(qSubject.active, subjectDto.getActive());
        update.set(qSubject.iconName, subjectDto.getIconName().trim());
        update.set(qSubject.colour, subjectDto.getColour().trim());
        update.set(qSubject.course, Course.builder().id(subjectDto.getCourseId()).build());

        update.where(qSubject.id.eq(subjectDto.getId()));

        long updateCount = update.execute();
        if (updateCount > 0) {
            resp.setSuccessful(true);
            resp.setErrorMessage("Subject update successful");
        }
        return resp;
    }
}
