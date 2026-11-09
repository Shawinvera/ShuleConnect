package com.softkit.wazi.service;

import com.softkit.wazi.entities.Grade;
import com.softkit.wazi.entities.GradeSubject;
import com.softkit.wazi.entities.Subject;
import com.softkit.wazi.mapper.GradeMapper;
import com.softkit.wazi.model.GradeSubjectDetailsDto;
import com.softkit.wazi.model.GradeSubjectDto;
import com.softkit.wazi.model.TopicSummaryDto;
import com.softkit.wazi.repository.CourseRepo;
import com.softkit.wazi.repository.GradeRepo;
import com.softkit.wazi.repository.GradeSubjectRepo;
import com.softkit.wazi.repository.SubjectRepo;
import com.softkit.wazi.util.ResponseUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GradeSubjectService {
    private final GradeMapper gradeMapper;
    private final GradeRepo gradeRepo;
    private final CourseRepo courseRepo;
    private final SubjectRepo subjectRepo;
    private final GradeSubjectRepo gradeSubjectRepo;

    public ResponseEntity<?> createGradeSubject(GradeSubjectDto gradeSubjectDto) {

        try {
            String gradeId = gradeSubjectDto.getGradeId();
            String subjectId = gradeSubjectDto.getSubjectId();

            Grade grade = new Grade();
            grade.setId(gradeId);
            Subject subject = new Subject();
            subject.setId(subjectId);

            GradeSubject gradeSubject = GradeSubject.builder()
                    .grade(grade)
                    .subject(subject)
                    .build();

            gradeSubjectRepo.save(gradeSubject);

            return ResponseUtils.entryCreatedResponse(gradeSubject.getId(), "Grade Subject");
        } catch (Exception e) {
            String errMessage = e.getMessage() != null ? e.getMessage() : "An error occurred while saving the grade subject";
            if (errMessage.contains("unique_grade_subject")) {
                return  ResponseUtils.duplicateErrorResponse();
            }
            return ResponseUtils.badRequestErrorResponse(errMessage);
        }
    }

    public List<GradeSubjectDetailsDto> getGradeSubjectByGradeId(String gradeId) {
        return gradeSubjectRepo.findByGradeId(gradeId);
    }

    public ResponseEntity<?> getTopicsByGradeSubjectId(String gradeSubjectId) {
        List<TopicSummaryDto> topicsBySubject = gradeSubjectRepo.findTopicsByGradeSubjectId(gradeSubjectId);
        return ResponseEntity.ok(topicsBySubject);
    }
}
