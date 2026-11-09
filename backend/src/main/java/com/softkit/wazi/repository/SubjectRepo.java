package com.softkit.wazi.repository;

import com.softkit.wazi.entities.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubjectRepo extends JpaRepository<Subject, String> {
    @Query(
        "SELECT s FROM Subject s join fetch s.course WHERE s.course.id = :courseId"
    )
    List<Subject> findByCourseId(@Param("courseId") String courseId);
    Optional<Subject> findFirstByNameIgnoreCaseAndCourse_Id(String name, String courseId);
}
