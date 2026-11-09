package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Table(
        name = "user_courses",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "unique_user_course",
                        columnNames = {"user_id", "course_id"}
                )
        }
)
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Builder
public class AppUserCourse {
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private String id;
    @Column(name = "creation_date", updatable = false, nullable = false)
    private Instant createdAt;
    private String userTimezone;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "course_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_auc_course_id")
    )
    private Course course;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "user_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_auc_user_id")
    )
    private AppUser user;

    @PrePersist
    protected void onCreate(){
        this.id = UuidGenerator.generateEntityUuid("user-course");
        this.createdAt = Instant.now();
    }
}
