package com.softkit.wazi.service;

import com.softkit.wazi.entities.*;
import com.softkit.wazi.mapper.LearnerMapper;
import com.softkit.wazi.model.*;
import com.softkit.wazi.repository.LearnerRepo;
import com.softkit.wazi.repository.LessonRepo;
import com.softkit.wazi.util.RequestContext;
import com.softkit.wazi.util.ResponseUtils;
import com.softkit.wazi.util.StringUtils;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaUpdate;
import jakarta.persistence.criteria.Root;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LearnerService {
    private final LearnerMapper learnerMapper;
    private final LearnerRepo learnerRepo;
    private final LessonRepo lessonRepo;
    private final GradeSubjectService gradeSubjectService;
    private final EntityManager entityManager;

    public ResponseEntity<?> registerLearner(LearnerDto learnerDto) {
        AppUser user = new AppUser();
        user.setId(learnerDto.getAppUserId());

        Grade grade = new Grade();
        grade.setId(learnerDto.getGradeId());

        Learner learnerEntity = learnerMapper.toLearnerEntity(learnerDto);
        learnerEntity.setPoints(0L);
        learnerEntity.setAppUser(user);
        learnerEntity.setGrade(grade);

        learnerRepo.saveAndFlush(learnerEntity);

        return ResponseUtils.entryCreatedResponse(learnerEntity.getId(), "Learner");
    }

    public List<LearnerDto> fetchLearnersByUserId(HttpServletRequest request, String userId) {
        return learnerRepo.fetchLearnersByUserId(userId);
    }

    public Object fetchLessonSummary(HttpServletRequest request, String learnerId) {
        Optional<Learner> _learner = learnerRepo.findById(learnerId);
        if (_learner.isEmpty()) {
            return CustomResponse
                    .builder()
                    .successful(false)
                    .errorMessage("Learner not found")
                    .build();
        }
        Learner learner = _learner.get();
        String gradeId = learner.getGrade().getId();
        List<SubjectLessonTrailDto> subjectLessonDtos = lessonRepo.fetchLessonsByGrade(gradeId);
        List<LessonTrackerDto> tracking = lessonRepo.fetchLearnerLessonTrack(learnerId);
        List<GradeSubjectDetailsDto> subjectsList = gradeSubjectService.getGradeSubjectByGradeId(gradeId);

        Set<LocalDate> uniqueDays = tracking.stream()
                .map(a -> getLocalDateFromInstantAndTimezone(a.getCompletedAt(), a.getUserTimezone()))
                .collect(Collectors.toCollection(TreeSet::new));

        String timeZone = RequestContext.getThreadData().getUserTimezone();
        int streak = calculateCurrentStreak(uniqueDays, timeZone);
        long learnerPoints = 0L;

        //for each of the lessons in subjectLessonDtos, check if it exists in tracking, if it does, set the completed field to true
        for (SubjectLessonTrailDto lesson : subjectLessonDtos) {
            for (LessonTrackerDto track : tracking) {
                if (lesson.getId().equals(track.getLessonId())) {
                    lesson.setCompleted(true);
                    break;
                }
            }
        }

        //calculate the percentage of lessons completed
        long totalLessons = subjectLessonDtos.size();
        long completedLessons = subjectLessonDtos.stream().filter(SubjectLessonTrailDto::getCompleted).count();
        double percentageCompleted = totalLessons > 0 ? (double) completedLessons / totalLessons * 100 : 0;
        //round to 2 decimal places
        percentageCompleted = Math.round(percentageCompleted);
        List<LearnerTrackerSummaryDto.SubjectSummary > summaryList = new ArrayList<>();

        //calculate percentage of lessons completed per subject
        for (GradeSubjectDetailsDto subject : subjectsList) {
            long subjectTotalLessons = subjectLessonDtos.stream().filter(lesson -> lesson.getSubjectId().equals(subject.getId())).count();
            long subjectCompletedLessons = subjectLessonDtos.stream().filter(lesson -> lesson.getSubjectId().equals(subject.getId()) && lesson.getCompleted()).count();
            long lessonPointsSum =         subjectLessonDtos.stream().filter(lesson -> lesson.getSubjectId().equals(subject.getId()) && lesson.getCompleted()).mapToLong(
                    lesson -> lesson.getLessonPoints()==null?0:lesson.getLessonPoints()
            ).sum();
            double subjectPercentageCompleted = subjectTotalLessons > 0 ? (double) subjectCompletedLessons / subjectTotalLessons * 100 : 0;
                subjectPercentageCompleted = Math.round(subjectPercentageCompleted);
                learnerPoints = learnerPoints+lessonPointsSum;

            //count all topics in the subject
            long totalTopics = subjectLessonDtos.stream().filter(lesson -> lesson.getSubjectId().equals(subject.getId())).map(SubjectLessonTrailDto::getTopicId).distinct().count();

            //count all subtopics in the subject
            long totalSubTopics = subjectLessonDtos.stream().filter(lesson -> lesson.getSubjectId().equals(subject.getId())).map(SubjectLessonTrailDto::getSubTopicId).distinct().count();
            LearnerTrackerSummaryDto.SubjectSummary summary = LearnerTrackerSummaryDto.SubjectSummary.builder()
                    .id(subject.getId())
                    .name(subject.getSubject())
                    .subTopicCount(totalSubTopics)
                    .topicCount(totalTopics)
                    .percentageCompleted(subjectPercentageCompleted)
                    .lessonCount(subjectTotalLessons)
                    .lessonCompletedCount(subjectCompletedLessons)
                    .colour(subject.getSubjectColour())
                    .iconName(subject.getSubjectIconName())
                    .points(lessonPointsSum)
                    .build();
            summaryList.add(summary);

        }

        LearnerTrackerSummaryDto trackerSummary = LearnerTrackerSummaryDto.builder()
                .learnerId(learnerId)
                .streak(streak)
                .subjects(summaryList)
                .lessonCount(totalLessons)
                .lessonCompletedCount(completedLessons)
                .percentageCompleted(percentageCompleted)
                .points(learnerPoints)
                .build();

        return trackerSummary;
    }

    private LocalDate getLocalDateFromInstantAndTimezone(Instant instant, String timezone) {
        //get current timezone of server if timezone is null
        timezone = StringUtils.getTimezone(timezone);

        return instant
                .atZone(ZoneId.of(timezone))
                .toLocalDate();
    }

    public int calculateCurrentStreak(Set<LocalDate> dates, String timezone) {

        if (dates.isEmpty()) return 0;
        //get current timezone of server if timezone is null
        timezone = StringUtils.getTimezone(timezone);

        LocalDate today = LocalDate.now(ZoneId.of(timezone));
        //today less a day
        int streak = 0;

        LocalDate cursor = today;
        //check if dates contain today, if not make today minus one day
        if (!dates.contains(today)) {
            cursor = today.minusDays(1);
        }

        while (dates.contains(cursor) ) {
            streak++;
            cursor = cursor.minusDays(1);
        }

        return streak;
    }



    public List<LessonTrackerDto> fetchLearnerHistory(
            HttpServletRequest request,
            String learnerId) {
        Pageable pageable = PageRequest.of(0, 10,
                Sort.by(Sort.Direction.DESC, "completedAt" ));
        return lessonRepo.fetchLearnerLearningHistory(learnerId, pageable);
    }

    public void updateLearnerSubscription(String learnerId, Instant expiryDate){
        learnerRepo.updateSubscription(learnerId, expiryDate);
    }

    public void updateLearnerPoints(String learnerId, Long scoredPoints){
        learnerRepo.updatePoints(learnerId, scoredPoints);
    }

    @Transactional
    public CustomResponse updateLearner(LearnerDto dto){
        CriteriaBuilder criteria = entityManager.getCriteriaBuilder();
        CriteriaUpdate<Learner> update = criteria.createCriteriaUpdate(Learner.class);
        Root<Learner> root = update.from(Learner.class);
        if (StringUtils.isNullOrEmpty(dto.getId())){
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage("Learner id is required")
                    .build();
        }
        if (!StringUtils.isNullOrEmpty(dto.getFirstName())){
            update.set("firstName", dto.getFirstName());
        }
        if (!StringUtils.isNullOrEmpty(dto.getLastName())){
            update.set("lastName", dto.getLastName());
        }
        update.set("preferredName", dto.getPreferredName());
        update.set("birthCertificateNumber", dto.getBirthCertificateNumber());
        if (dto.getDob() != null) {
            update.set("dob", dto.getDob());
        }
        if (!StringUtils.isNullOrEmpty(dto.getGender())) {
            update.set("gender", dto.getGender());
        }
        if (!StringUtils.isNullOrEmpty(dto.getGradeId())) {
            Grade grade = new Grade();
            grade.setId(dto.getGradeId());
            update.set("grade", grade);
        }
        update.set("avatar", dto.getAvatar());
        update.set("lastUpdated", Instant.now());

        update.where(criteria.equal(root.get("id"), dto.getId()));
        int updateCount = 0;
        String errorMessage = "";
        try {
            updateCount = entityManager.createQuery(update).executeUpdate();
            errorMessage = updateCount > 0 ? "Learner updated" : "Learner not found. Update request failed";
        } catch (Exception e) {
            log.error("Error updating learner with id {}: {}", dto.getId(), e.getMessage());
            errorMessage = "An error occurred while updating the learner. Please try again later.";
        }
        return CustomResponse.builder()
                .successful(updateCount > 0)
                .errorMessage(errorMessage)
                .build();

    }
}
