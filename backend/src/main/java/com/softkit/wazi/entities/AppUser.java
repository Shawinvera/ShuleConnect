package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "unique_username",
                        columnNames = {"username"}
                )
        }
)
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Builder
public class AppUser{
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private String id;
    @Column(name = "creation_date", updatable = false, nullable = false)
    private Instant createdAt;
    private String userTimezone;
    private String username;
    private String password;
    private String firstName;
    private String lastName;
    private String role;
    @Builder.Default
    private Integer failedAttempts=0;
    @Builder.Default
    private Boolean accountNonLocked=true;
    private Instant lockTime;
    private Instant lastLoginAt;
    private String tokenId;
    private String refreshToken;
    private Instant refreshTokenExpiry;
    private Boolean refreshTokenActive;
    private String loginProvider;
    private String phoneNumber;
    @Builder.Default
    private Boolean activated=false;
    private String activationToken;
    private String countryCode;
    @Column(length = 6)
    private String otp;
    private Instant lastUpdated;
    private Instant passwordResetDate;
    private String passwordResetToken;
    private String passwordResetOtp;


    @PrePersist
    protected void onCreate(){
        this.id = UuidGenerator.generateEntityUuid("user");
        this.createdAt = Instant.now();
        this.failedAttempts=0;
        this.accountNonLocked=true;
        if (this.loginProvider == null){
            loginProvider = "LOCAL";
        }
        if (this.activated == null){
            activated=false;
        }
    }
}
