package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Table(
        name = "courses",
uniqueConstraints = {
                @UniqueConstraint(
                        name = "unique_course_title",
                        columnNames = {"title", "country_code"}
                )
        })
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Builder
public class Course  {
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private String id;
    @Column(name = "creation_date", updatable = false, nullable = false)
    private Instant createdAt;
    private String userTimezone;

    @Column(nullable = false)
    private String title;
    @Column(nullable = false)
    private String countryCode;
    private Boolean premium;
    private String description;
    private Boolean active;
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "course")
    private List<Grade> grades;
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "course")
    private List<Subject> subjects;
    private String shortCode;

    @PrePersist
    protected void onCreate(){
        this.id = UuidGenerator.generateEntityUuid("course");
        this.createdAt = Instant.now();
    }

}
