package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Table(
        name = "subjects",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "unique_course_subject_name",
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
public class Subject {
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private String id;
    @Column(name = "creation_date", updatable = false, nullable = false)
    private Instant createdAt;
    private String userTimezone;
    private String name;
    private String description;
    private Boolean active;
    private String iconName;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "course_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_subject_course_id")
    )
    private Course course;

    @PrePersist
    protected void onCreate(){
        this.id = UuidGenerator.generateEntityUuid("subject");
        this.createdAt = Instant.now();
    }
    private String colour;

}
