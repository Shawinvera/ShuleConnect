package com.softkit.wazi.model;

import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class LearnerDto {
    private String id;
    private Instant createdAt;
    private String userTimezone;
    private String firstName;
    private String lastName;
    private String preferredName;
    private String birthCertificateNumber;
    private String gender;
    private LocalDate dob;
    private String gradeName;
    private String gradeId;
    private String appUserId;
    private Long points;
    private Instant subscriptionExpiryDate;
    private String subscriptionExpiryTimeZone;
    private String avatar;
    private String courseId;
    private Instant lastUpdated;
}
