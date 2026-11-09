package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Table(
        name = "grades",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "unique_course_grade_name",
                        columnNames = {"name", "course_id"}
                )
        }
)
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Builder
public class Grade {
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private String id;
    @Column(name = "creation_date", updatable = false, nullable = false)
    private Instant createdAt;
    private String userTimezone;
    String name;
    String description;
    Boolean active;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "course_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_grade_course_id")
    )
    private Course course;

    @PrePersist
    protected void onCreate(){
        this.id = UuidGenerator.generateEntityUuid("grade");
        this.createdAt = Instant.now();
    }
}
