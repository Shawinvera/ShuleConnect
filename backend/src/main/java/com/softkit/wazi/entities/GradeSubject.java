package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Table(
        name = "grade_subjects",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "unique_grade_subject",
                        columnNames = {"grade_id", "subject_id"}
                )
        }
)
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Builder
public class GradeSubject  {
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private String id;
    @Column(name = "creation_date", updatable = false, nullable = false)
    private Instant createdAt;
    private String userTimezone;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "grade_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_gs_grade_id")
    )
    private Grade grade;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "subject_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_gs_subject_id")
    )
    private Subject subject;
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "gradeSubject")
    private List<Topic> topics;

    @PrePersist
    protected void onCreate(){
        this.id = UuidGenerator.generateEntityUuid("gradesubject");
        this.createdAt = Instant.now();
    }
}
