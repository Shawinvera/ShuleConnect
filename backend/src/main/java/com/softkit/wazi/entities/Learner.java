package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalUnit;

@Table(name = "learners")
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Builder
public class Learner {
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private String id;
    @Column(name = "creation_date", updatable = false, nullable = false)
    private Instant createdAt;
    private String userTimezone;
    private String firstName;
    private String lastName;
    private String preferredName;
    private String birthCertificateNumber;
    private String gender;
    private LocalDate dob;
    private Instant subscriptionExpiryDate;
    private String subscriptionExpiryTimeZone;
    private String avatar;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "grade_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_learner_grade_id")
    )
    private Grade grade;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "app_user_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_learner_app_user_id")
    )
    private AppUser appUser;
    private Long points;
    private Instant lastUpdated;

    @PrePersist
    protected void onCreate(){
        this.id = UuidGenerator.generateEntityUuid("leaner");
        this.createdAt = Instant.now();
        this.subscriptionExpiryDate = this.createdAt.plus(5, ChronoUnit.MINUTES);
    }
}
