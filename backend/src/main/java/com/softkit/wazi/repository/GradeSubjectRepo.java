package com.softkit.wazi.repository;

import com.softkit.wazi.entities.GradeSubject;
import com.softkit.wazi.model.GradeSubjectDetailsDto;
import com.softkit.wazi.model.TopicSummaryDto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GradeSubjectRepo extends JpaRepository<GradeSubject, String> {
    @Query("SELECT new " +
            "com.softkit.wazi.model.GradeSubjectDetailsDto(" +
            "gs.subject.id, gs.subject.name, gs.subject.description," +
            "count(t.id)," +
            "gs.subject.colour," +
            "gs.subject.iconName," +
            "gs.id) " +
           "FROM GradeSubject gs " +
            "LEFT JOIN Topic t ON gs.id = t.gradeSubject.id " +
           "WHERE gs.grade.id= :gradeId AND gs.subject.active= true " +
            "GROUP BY gs.id, gs.subject.name, gs.subject.description")
    List<GradeSubjectDetailsDto> findByGradeId(@Param("gradeId") String gradeId);

    @Query(
            "SELECT " +
                    "t.id as id, t.name as name, t.description as description, t.active as active, t.orderIndex as orderIndex, " +
                    "count(st.id) as subTopicCount " +
                    "FROM Topic t " +
                    "LEFT JOIN SubTopic st ON t.id = st.topic.id " +
                    "WHERE t.gradeSubject.id= :gradeSubjectId " +
                    "GROUP BY t.id, t.name, t.description, t.active, t.orderIndex"

    )
    List<TopicSummaryDto> findTopicsByGradeSubjectId(@Param("gradeSubjectId") String gradeSubjectId);

    /**
     * count GradeSubject by subjectId and gradeId
     */
    @Query("SELECT COUNT(gs) " +
                    "FROM GradeSubject gs " +
                    "WHERE gs.subject.id = :subjectId AND gs.grade.id = :gradeId"
    )
    Long countBySubjectIdAndGradeId(@Param("subjectId") String subjectId, @Param("gradeId") String gradeId);
}
