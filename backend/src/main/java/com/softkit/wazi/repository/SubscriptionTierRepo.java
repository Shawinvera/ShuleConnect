package com.softkit.wazi.repository;

import com.softkit.wazi.entities.Billing;
import com.softkit.wazi.entities.SubscriptionTier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionTierRepo extends JpaRepository<SubscriptionTier, String> {
    List<SubscriptionTier> findByCourseIdAndStatus(String courseId, Integer status);
    List<SubscriptionTier> findByCourseId(String courseId);
}
