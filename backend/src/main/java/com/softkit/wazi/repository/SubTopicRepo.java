package com.softkit.wazi.repository;

import com.softkit.wazi.entities.SubTopic;
import com.softkit.wazi.model.SubTopicSummaryDto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubTopicRepo extends JpaRepository<SubTopic, String> {

    @Query(
            "SELECT " +
                    "st.id as id, st.name as name, st.description as description, st.active as active, " +
                    "count(l.id) as lessonCount, st.orderIndex as orderIndex " +
                    "FROM SubTopic st " +
                    "LEFT JOIN Lesson l ON st.id = l.subTopic.id " +
                    "WHERE st.topic.id= :topicId " +
                    "GROUP BY st.id, st.name, st.description, st.active"

    )
    List<SubTopicSummaryDto> findSubTopicsSummaryByTopicId(@Param("topicId") String topicId);

    Optional<SubTopic> findFirstByNameIgnoreCaseAndTopic_Id(String name, String topicId);

    @Query("SELECT COUNT(t) FROM SubTopic t WHERE t.topic.id = :topicId")
    Integer countByTopicId(String topicId);
}
