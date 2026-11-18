package com.softkit.wazi.repository;

import com.softkit.wazi.entities.AppNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface AppNotificationRepo extends JpaRepository<AppNotification, String> {

    List<AppNotification> findByUserIdOrderByCreatedAtDesc(String userId);

    List<AppNotification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(String userId);

    long countByUserIdAndIsReadFalse(String userId);

    @Modifying
    @Transactional
    @Query("UPDATE AppNotification n SET n.isRead = true WHERE n.userId = :userId")
    void markAllReadByUserId(@Param("userId") String userId);

    @Modifying
    @Transactional
    @Query("UPDATE AppNotification n SET n.isRead = true WHERE n.id = :id")
    void markReadById(@Param("id") String id);
}
