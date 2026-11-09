package com.softkit.wazi.repository;

import com.softkit.wazi.entities.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface AppUserRepo extends JpaRepository<AppUser, String> {
    Optional<AppUser> findByUsernameIgnoreCaseAndActivated(String username, Boolean activated);
    Optional<AppUser> findByUsernameIgnoreCase(String username);

    @Transactional
    @Modifying
    @Query("UPDATE AppUser u SET u.tokenId = :tokenId, u.lastLoginAt = :loginAt, u.refreshToken=:refreshToken, u.refreshTokenExpiry=:refreshTokenExpiry  WHERE u.id = :userId")
    void updateSuccessfullyLoggedIn(String tokenId, Instant loginAt, String refreshToken, Instant refreshTokenExpiry, String userId);
    @Transactional
    @Modifying
    @Query("UPDATE AppUser u SET u.activated = true WHERE u.id = :userId")
    void activateUserById(String userId);

    List<AppUser> findByRefreshToken(String refreshToken);

    @Transactional
    @Modifying
    @Query("UPDATE AppUser u SET u.phoneNumber = :phoneNumber WHERE u.id = :userId")
    void updateUserPhoneNumber(String phoneNumber, String userId);

    @Transactional
    @Modifying
    @Query("UPDATE AppUser u " +
            "SET " +
            "u.password = :password, u.passwordResetDate = :passwordResetDate, " +
            "u.passwordResetToken=null, u.passwordResetOtp=null  " +
            "WHERE " +
            "u.username = :username AND u.passwordResetToken=:passwordResetToken AND u.passwordResetOtp=:passwordResetOtp")
    Long updatePasswordPublic(String password, Instant passwordResetDate,
                              String username, String passwordResetToken,
                              String passwordResetOtp);

    @Transactional
    @Modifying
    @Query("UPDATE AppUser u SET u.password = :password WHERE u.id = :userId ")
    Long updatePassword(String password, String userId);

    @Transactional
    @Modifying
    @Query("UPDATE AppUser u " +
            "SET " +
            "u.passwordResetOtp = :passwordResetOtp, u.passwordResetToken=:passwordResetToken " +
            "WHERE u.username = :username")
    Long setPasswordResetDetails(String passwordResetOtp, String passwordResetToken, String username);

}
