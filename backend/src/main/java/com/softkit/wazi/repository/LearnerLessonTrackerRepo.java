package com.softkit.wazi.repository;

import com.softkit.wazi.entities.LearnerLessonTracker;
import com.softkit.wazi.entities.Lesson;
import com.softkit.wazi.model.SubjectLessonDto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LearnerLessonTrackerRepo extends JpaRepository<LearnerLessonTracker, String> {
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
            "l.points," +
            "false" +
            ") " +
            "FROM Lesson l " +
            "JOIN l.subTopic st " +
            "JOIN st.topic t " +
            "JOIN t.gradeSubject gs " +
            "WHERE gs.subject.id = :subjectId")
    List<SubjectLessonDto> fetchLessonsBySubject(String subjectId);

    //Fetch list of lessonIds that have been completed
    @Query("SELECT ls.id " +
            "FROM LearnerLessonTracker llt " +
            "JOIN llt.lesson ls " +
            "JOIN llt.learner ln " +
            "WHERE ln.id=:learnerId")
    List<String> fetchLearnerCompletedLessonIds(String learnerId);
}
