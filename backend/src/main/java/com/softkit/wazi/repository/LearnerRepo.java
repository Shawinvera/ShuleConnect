package com.softkit.wazi.repository;

import com.softkit.wazi.entities.AppUser;
import com.softkit.wazi.entities.Learner;
import com.softkit.wazi.model.LearnerDto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface LearnerRepo extends JpaRepository<Learner, String> {
    @Query("SELECT new com.softkit.wazi.model.LearnerDto(" +
            "l.id, " +
            "l.createdAt, " +
            "l.userTimezone," +
            "l.firstName," +
            "l.lastName," +
            "l.preferredName," +
            "l.birthCertificateNumber," +
            "l.gender," +
            "l.dob," +
            "g.name," +
            "g.id," +
            "u.id," +
            "l.points," +
            "l.subscriptionExpiryDate," +
            "l.subscriptionExpiryTimeZone," +
            "l.avatar," +
            "c.id," +
            "l.lastUpdated" +
            ") FROM Learner l " +
            "JOIN l.appUser u " +
            "JOIN l.grade g " +
            "JOIN g.course c " +
            "WHERE u.id = :userId")
    List<LearnerDto> fetchLearnersByUserId(String userId);


    @Transactional
    @Modifying
    @Query("UPDATE Learner set subscriptionExpiryDate=:expiryDate WHERE id=:learnerId")
    void updateSubscription(String learnerId, Instant expiryDate);

    @Transactional
    @Modifying
    @Query("UPDATE Learner SET points=(points+:scoredPoints) WHERE id=:learnerId")
    void updatePoints(String learnerId, Long scoredPoints);
}
