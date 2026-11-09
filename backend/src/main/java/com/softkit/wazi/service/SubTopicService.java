package com.softkit.wazi.service;

import com.querydsl.jpa.impl.JPAUpdateClause;
import com.softkit.wazi.entities.QSubTopic;
import com.softkit.wazi.entities.SubTopic;
import com.softkit.wazi.entities.Topic;
import com.softkit.wazi.mapper.SubTopicMapper;
import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.model.SubTopicDto;
import com.softkit.wazi.model.SubTopicSummaryDto;
import com.softkit.wazi.repository.SubTopicRepo;
import com.softkit.wazi.repository.TopicRepo;
import com.softkit.wazi.util.ResponseUtils;
import jakarta.persistence.EntityManager;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.apache.tomcat.util.http.ResponseUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SubTopicService {
    private final SubTopicMapper subTopicMapper;
    private final SubTopicRepo subTopicRepo;
    private final EntityManager entityManager;

    public ResponseEntity<?> createSubTopic(SubTopicDto subTopicDto) {
        try {
            String name = subTopicDto.getName().trim().toUpperCase();
            subTopicDto.setName(name);

            Topic topic = new Topic();
            String topicId = subTopicDto.getTopicId();
            topic.setId(topicId);

            SubTopic subTopicEntity = subTopicMapper.toSubTopicEntity(subTopicDto);
            subTopicEntity.setTopic(topic);
            Integer subTopicCount = subTopicRepo.countByTopicId(topicId);
            subTopicCount =subTopicCount+1;
            subTopicEntity.setOrderIndex(subTopicCount);

            subTopicRepo.save(subTopicEntity);
            return ResponseUtils.entryCreatedResponse(subTopicEntity.getId(), "Sub-Topic");
        } catch (Exception e) {
            String errMessage = e.getMessage() != null ? e.getMessage() : "An error occurred while saving the sub-topic";
            if (errMessage.contains("unique_topic_subtopic_name")) {
                return ResponseUtils.duplicateErrorResponse();
            }
            return ResponseUtils.badRequestErrorResponse(errMessage);
        }
    }

    public ResponseEntity<List<SubTopicSummaryDto>> getSubTopicsByTopicId(String topicId) {
        List<SubTopicSummaryDto> subTopics = subTopicRepo.findSubTopicsSummaryByTopicId(topicId);
        return ResponseEntity.ok(subTopics);
    }

    @Transactional
    public CustomResponse updateSubTopic(@Valid SubTopicDto subTopicDto) {
        CustomResponse resp = CustomResponse.builder()
                .errorMessage("Sub-Topic update failed")
                .successful(false)
                .build();
        QSubTopic subTopic = QSubTopic.subTopic;
        JPAUpdateClause update = new JPAUpdateClause(entityManager, subTopic);
        update.set(subTopic.name, subTopicDto.getName().trim());
        if (subTopicDto.getOrderIndex() != null) {
            update.set(subTopic.orderIndex, subTopicDto.getOrderIndex());
        }
        update.set(subTopic.description, subTopicDto.getDescription().trim());
        update.set(subTopic.active, subTopicDto.getActive());

        update.where(subTopic.id.eq(subTopicDto.getId()));
        long affectedRows = update.execute();
        if (affectedRows > 0) {
            resp.setSuccessful(true);
            resp.setErrorMessage("");
            resp.setData("Sub-Topic updated successfully");
        }
        return resp;
    }
}
