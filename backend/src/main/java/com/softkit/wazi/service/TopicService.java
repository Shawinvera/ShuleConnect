package com.softkit.wazi.service;

import com.querydsl.jpa.impl.JPAUpdateClause;
import com.softkit.wazi.entities.GradeSubject;
import com.softkit.wazi.entities.QTopic;
import com.softkit.wazi.entities.Topic;
import com.softkit.wazi.mapper.TopicMapper;
import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.model.TopicDto;
import com.softkit.wazi.repository.GradeSubjectRepo;
import com.softkit.wazi.repository.TopicRepo;
import com.softkit.wazi.util.ResponseUtils;
import jakarta.persistence.EntityManager;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TopicService {
    private final TopicMapper topicMapper;
    private final TopicRepo topicRepo;
    private final EntityManager entityManager;

    public ResponseEntity<?> createTopic(@Valid TopicDto topicDto) {
        try {
            String title = topicDto.getName().toUpperCase().trim();
            topicDto.setName(title);

            GradeSubject gradeSubject = new GradeSubject();
            String gradeSubjectId = topicDto.getGradeSubjectId();
            gradeSubject.setId(gradeSubjectId);

            Topic topicEntity = topicMapper.toTopicEntity(topicDto);
            Integer topicCount = topicRepo.countByGradeSubject_Id(gradeSubjectId);
            topicCount =topicCount+1;
            topicEntity.setOrderIndex(topicCount);
            topicEntity.setGradeSubject(gradeSubject);

            topicRepo.save(topicEntity);
            return ResponseUtils.entryCreatedResponse(topicEntity.getId(), "Topic");
        } catch (Exception e) {
            String errMessage = e.getMessage() != null ? e.getMessage() : "An error occurred while saving the topic";
            if (errMessage.contains("unique_grade_subject_topic")) {
                return ResponseUtils.duplicateErrorResponse();
            }
            return ResponseUtils.badRequestErrorResponse(errMessage);
        }
    }

    @Transactional
    public CustomResponse updateTopic(@Valid TopicDto topicDto) {
        CustomResponse resp= CustomResponse.builder()
                .successful(false)
                .errorMessage("Topic update failed")
                .build();

        QTopic qTopic = QTopic.topic;
        JPAUpdateClause update = new JPAUpdateClause(entityManager, qTopic);
        update.set(qTopic.name, topicDto.getName().trim());
        update.set(qTopic.description, topicDto.getDescription().trim());
        if (topicDto.getOrderIndex() != null) {
            update.set(qTopic.orderIndex, topicDto.getOrderIndex());
        }
        update.set(qTopic.gradeSubject, GradeSubject.builder().id(topicDto.getGradeSubjectId()).build());
        update.where(qTopic.id.eq(topicDto.getId()));

        long count = update.execute();
        if (count >0) {
            resp.setSuccessful(true);
            resp.setErrorMessage("Topic updated successfully");
        }
        return resp;
    }
}
