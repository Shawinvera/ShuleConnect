package com.softkit.wazi.repository;

import com.softkit.wazi.entities.Grade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GradeRepo extends JpaRepository<Grade, String> {

    @Query("SELECT g FROM Grade g join fetch g.course WHERE g.course.id = :courseId")
    List<Grade> findByCourseId(@Param("courseId") String courseId);

    /**
     * Find grade by name (case insensitive) and course id
     */
    Optional<Grade> findByNameIgnoreCaseAndCourse_Id(String gradeName, String courseId);
}
