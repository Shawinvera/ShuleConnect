package com.softkit.wazi.service;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Expression;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.querydsl.jpa.impl.JPAUpdateClause;
import com.softkit.wazi.entities.*;
import com.softkit.wazi.mapper.LessonMapper;
import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.model.LessonTrackerDto;
import com.softkit.wazi.model.LessonDto;
import com.softkit.wazi.model.SubjectLessonDto;
import com.softkit.wazi.repository.LearnerLessonTrackerRepo;
import com.softkit.wazi.repository.LessonRepo;
import com.softkit.wazi.util.ResponseUtils;
import com.softkit.wazi.util.StringUtils;
import jakarta.persistence.EntityManager;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.hibernate.query.results.internal.Builders.fetch;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonService {
    private final LessonMapper lessonMapper;
    private final LessonRepo lessonRepo;
    private final LearnerLessonTrackerRepo learnerLessonTrackerRepo;
    private final LearnerService learnerService;
    private final EntityManager entityManager;
    private final JPAQueryFactory jpaQueryFactory;

    public ResponseEntity<?> createLesson(LessonDto lessonDto) {

        SubTopic subTopic = new SubTopic();
        String subTopicId = lessonDto.getSubTopicId();
        subTopic.setId(subTopicId);
        Integer lessonCount = lessonRepo.countBySubTopicId(subTopicId);
        lessonCount = lessonCount + 1;

        Lesson lessonEntity = lessonMapper.toLessonEntity(lessonDto);
        lessonEntity.setOrderIndex(lessonCount);
        lessonEntity.setSubTopic(subTopic);
        if (lessonDto.getPoints()==null) {
            lessonEntity.setPoints(1L);
        }

        lessonRepo.save(lessonEntity);
        return ResponseUtils.entryCreatedResponse(lessonEntity.getId(), "Lesson");
    }

    public List<LessonDto> findLessonsBySubtopicId(String subTopicId, String learnerId) {
        List<Lesson> lessonEntityList = lessonRepo.findBySubTopicId(subTopicId);
        List<LessonDto> lessonDtoList = lessonEntityList.stream()
                .map(lessonMapper::toLessonDto)
                .peek(l -> {
                    l.setSubTopicId(subTopicId);
                    l.setLearnerCompleted(false);
                })
                .toList();
        if (learnerId == null || learnerId.isEmpty() || lessonDtoList.isEmpty()) {
            return lessonDtoList;
        }

        List<String> completedLessonIds = learnerLessonTrackerRepo.fetchLearnerCompletedLessonIds(learnerId);
        //for the activeLessons set completed if lessonId is in the completed list
        lessonDtoList.forEach(l->{
            if (completedLessonIds.contains(l.getId())){
                l.setLearnerCompleted(true);
            }
        });
        return lessonDtoList;

    }

    public List<SubjectLessonDto> fetchLessonsBySubjectId(String subjectId, String learnerId) {
        List<SubjectLessonDto> allLessons = lessonRepo.fetchLessonsBySubject(subjectId);

        //active lessons only
        List<SubjectLessonDto> activeLessons = allLessons.stream().filter(SubjectLessonDto::getActive).toList();


        //if learnerId is provided we will check which lessons have been completed by the learner and set the completed flag accordingly
        if (learnerId == null || learnerId.isEmpty()){
            return activeLessons;
        }
        return updateLessonStatusForLearner(learnerId, activeLessons);
    }

    private @NonNull List<SubjectLessonDto> updateLessonStatusForLearner(String learnerId, List<SubjectLessonDto> activeLessons) {
        List<String> completedLessonIds = learnerLessonTrackerRepo.fetchLearnerCompletedLessonIds(learnerId);
        //for the activeLessons set completed if lessonId is in the completed list
        activeLessons.forEach(l->{
            if (completedLessonIds.contains(l.getId())){
                l.setLearnerCompleted(true);
            }
        });

        return activeLessons;
    }

    public LessonTrackerDto markLessonComplete(LessonTrackerDto tracker){
        String lessonId = tracker.getLessonId();
        Lesson lesson= Lesson.builder()
                .id(lessonId)
                .build();

        Learner learner= Learner.builder()
                .id(tracker.getLearnerId())
                .build();
        Long lessonPoints = fetchLessonPoint(lessonId);

        try {
            LearnerLessonTracker trackerEntity= LearnerLessonTracker.builder()
                    .lesson(lesson)
                    .learner(learner)
                    .build();
            trackerEntity = learnerLessonTrackerRepo.save(trackerEntity);
            tracker.setId(trackerEntity.getId());
            tracker.setCompletedAt(trackerEntity.getCompletedAt());
            learnerService.updateLearnerPoints(tracker.getLearnerId(), lessonPoints);
        } catch (Exception e) {
            String errMessage = e.getMessage() != null ? e.getMessage() : "An error occurred while marking the lesson as complete";
            log.error("Error marking lesson as complete: {}", errMessage);
        }
        return tracker;

    }

    public Long fetchLessonPoint(String lessonId){
        return lessonRepo.findLessonPointsByLessonId(lessonId);
    }


    @Transactional
    public CustomResponse updateLesson(@Valid LessonDto lessonDto) {
        CustomResponse resp = CustomResponse.builder()
                .errorMessage("Lesson update failed")
                .successful(false)
                .build();
        QLesson lesson = QLesson.lesson;
        JPAUpdateClause update = new JPAUpdateClause(entityManager, lesson);
        update.set(lesson.name, lessonDto.getName().trim());
        update.set(lesson.content, lessonDto.getContent());
        update.set(lesson.videoUrl, lessonDto.getVideoUrl());
        update.set(lesson.active, lessonDto.getActive());
        update.set(lesson.subTopic, SubTopic.builder().id(lessonDto.getSubTopicId()).build());
        if (lessonDto.getOrderIndex() != null) {
            update.set(lesson.orderIndex, lessonDto.getOrderIndex());
        }
        update.set(lesson.duration, lessonDto.getDuration());
        update.set(lesson.trailer, lessonDto.getTrailer());
        update.set(lesson.points, lessonDto.getPoints());
        update.where(lesson.id.eq(lessonDto.getId()));

        long affectedRows = update.execute();
        if (affectedRows > 0) {
            resp.setSuccessful(true);
            resp.setErrorMessage("");
            resp.setData("Lesson update successful");
        }
        return resp;
    }



    public @NonNull List<SubjectLessonDto> lessonFetch(String gradeSubjectId, String lernerId) {
        lernerId = StringUtils.trimString(lernerId);
        gradeSubjectId = StringUtils.trimString(gradeSubjectId);

        QLesson lesson = QLesson.lesson;
        QSubTopic subTopic = QSubTopic.subTopic;
        QTopic topic = QTopic.topic;
        QGradeSubject gradeSubject = QGradeSubject.gradeSubject;
        QLearnerLessonTracker learnerLessonTracker = QLearnerLessonTracker.learnerLessonTracker;

        BooleanBuilder builder = new BooleanBuilder();
        if (gradeSubjectId != null && !gradeSubjectId.isEmpty()) {
            builder.and(gradeSubject.id.eq(gradeSubjectId));
        }

        Expression<Boolean> completed = lernerId != null && !lernerId.isEmpty() ?
                Expressions.asBoolean(learnerLessonTracker.id.isNotNull()) : Expressions.constant(false);


        JPAQuery<SubjectLessonDto> query = jpaQueryFactory
                .select(
                        Projections.constructor(
                                SubjectLessonDto.class,
                                lesson.id,
                                lesson.name,
                                lesson.content,
                                lesson.videoUrl,
                                lesson.active,
                                lesson.orderIndex,
                                lesson.duration,
                                lesson.trailer,
                                subTopic.id.as("subTopicId"),
                                subTopic.name.as("subTopicName"),
                                subTopic.orderIndex.as("subTopicOrderIndex"),
                                topic.id.as("topicId"),
                                topic.name.as("topicName"),
                                topic.orderIndex.as("topicOrderIndex"),
                                lesson.points,
                                completed

                        ))
                .from(lesson)
                .join(lesson.subTopic, subTopic)
                .join(subTopic.topic, topic)
                .join(gradeSubject, gradeSubject)
                .where(builder);


        if (lernerId != null && !lernerId.isEmpty()) {
            query.leftJoin(learnerLessonTracker).on(
                    learnerLessonTracker.lesson.id.eq(lesson.id)
                            .and(learnerLessonTracker.learner.id.eq(lernerId))
            );
        }

                return query.fetch();
    }


}
