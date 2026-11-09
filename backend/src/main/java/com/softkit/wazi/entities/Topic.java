package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Table(
        name = "topics",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "unique_grade_subject_topic",
                        columnNames = {"name", "grade_subject_id"}
                )
        }
)
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Builder
public class Topic {
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private String id;
    @Column(name = "creation_date", updatable = false, nullable = false)
    private Instant createdAt;
    private String userTimezone;
    private String name;
    //description column that can hold large text such as article content
    @Column(columnDefinition = "LONGTEXT")
    @Lob
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "grade_subject_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_topic_grade_subj_id")
    )
    private GradeSubject gradeSubject;
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "topic")
    private List<SubTopic> subTopics;
    private Boolean active;
    private Integer orderIndex;

    @PrePersist
    protected void onCreate(){
        this.id = UuidGenerator.generateEntityUuid("topic");
        this.createdAt = Instant.now();
    }
}
