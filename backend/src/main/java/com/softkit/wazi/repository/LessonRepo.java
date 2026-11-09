package com.softkit.wazi.repository;

import com.softkit.wazi.entities.Lesson;
import com.softkit.wazi.entities.SubTopic;
import com.softkit.wazi.model.LearnerDto;
import com.softkit.wazi.model.LessonTrackerDto;
import com.softkit.wazi.model.SubjectLessonDto;
import com.softkit.wazi.model.SubjectLessonTrailDto;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LessonRepo extends JpaRepository<Lesson, String> {
    /**
     * find lessons by subTopicId
     */
    @Query(
            "SELECT l FROM Lesson l JOIN FETCH l.subTopic WHERE l.subTopic.id = :subTopicId"
    )
    List<Lesson> findBySubTopicId(@Param("subTopicId") String subTopicId);

    @Query("SELECT new com.softkit.wazi.model.SubjectLessonDto(" +
            "l.id," +
            "l.name," +
            "l.content," +
            "l.videoUrl," +
            "l.active," +
            "l.orderIndex," +
            "l.duration," +
            "l.trailer," +
            "st.id," +
            "st.name," +
            "st.orderIndex," +
            "t.id," +
            "t.name," +
            "t.orderIndex," +
            "l.points, false" +
            ") " +
            "FROM Lesson l " +
            "JOIN l.subTopic st " +
            "JOIN st.topic t " +
            "JOIN t.gradeSubject gs " +
            "WHERE gs.subject.id = :subjectId")
    List<SubjectLessonDto> fetchLessonsBySubject(String subjectId);

    @Query("SELECT new com.softkit.wazi.model.SubjectLessonTrailDto(" +
            "l.id," +
            "l.name," +
            "l.trailer," +
            "st.id," +
            "st.name," +
            "t.id," +
            "t.name," +
            "s.id," +
            "s.name," +
            "false," +
            "l.points" +
            ") " +
            "FROM Lesson l " +
            "JOIN l.subTopic st " +
            "JOIN st.topic t " +
            "JOIN t.gradeSubject gs " +
            "JOIN gs.subject s " +
            "WHERE gs.grade.id = :gradeId")
    List<SubjectLessonTrailDto> fetchLessonsByGrade(String gradeId);

    @Query("SELECT new com.softkit.wazi.model.LessonTrackerDto(" +
            "llt.id," +
            "l.id," +
            "ls.id," +
            "llt.completedAt, " +
            "ls.name, ''," +
            "ls.points) " +
            "FROM LearnerLessonTracker llt " +
            "JOIN llt.learner l " +
            "JOIN llt.lesson ls " +
            "WHERE l.id = :learnerId")
    List<LessonTrackerDto> fetchLearnerLessonTrack(String learnerId);

    @Query("SELECT new com.softkit.wazi.model.LessonTrackerDto(" +
            "llt.id," +
            "l.id," +
            "ls.id," +
            "llt.completedAt," +
            "ls.name," +
            "s.name," +
            "ls.points" +
            ") " +
            "FROM LearnerLessonTracker llt " +
            "JOIN llt.learner l " +
            "JOIN llt.lesson ls " +
            "JOIN ls.subTopic sb " +
            "JOIN sb.topic t " +
            "JOIN t.gradeSubject gs " +
            "JOIN gs.subject s " +
            "WHERE l.id = :learnerId")
    List<LessonTrackerDto> fetchLearnerLearningHistory(String learnerId, Pageable pageable);



    @Query("SELECT COUNT(l) FROM Lesson l WHERE l.subTopic.id = :subTopicId")
    Integer countBySubTopicId(String subTopicId);

    @Query("SELECT l.points FROM Lesson l WHERE l.id = :lessonId")
    Long findLessonPointsByLessonId(String lessonId);
}
