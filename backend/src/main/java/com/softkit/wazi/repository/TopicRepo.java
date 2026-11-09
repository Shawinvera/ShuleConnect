package com.softkit.wazi.repository;

import com.softkit.wazi.entities.Subject;
import com.softkit.wazi.entities.Topic;
import com.softkit.wazi.model.SubTopicSummaryDto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TopicRepo extends JpaRepository<Topic, String> {

    @Query(
            "SELECT " +
                    "st.id as id, st.name as name, st.description as description, st.active as active, " +
                    "count(l.id) as lessonCount " +
                    "FROM SubTopic st " +
                    "LEFT JOIN Lesson l ON st.id = l.subTopic.id " +
                    "WHERE st.id= :subTopicId " +
                    "GROUP BY st.id, st.name, st.description, st.active"

    )
    List<SubTopicSummaryDto> findSubTopicsSummaryById(@Param("subTopicId") String subTopicId);

    Optional<Topic> findFirstByNameIgnoreCaseAndGradeSubject_Id(String title, String gradeSubjectId);

    @Query("SELECT COUNT(t) FROM Topic t WHERE t.gradeSubject.id = :gradeSubjectId")
    Integer countByGradeSubject_Id(String gradeSubjectId);
}
