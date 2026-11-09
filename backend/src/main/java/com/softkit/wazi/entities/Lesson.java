package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Table(name = "lessons")
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Builder
public class Lesson {
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private String id;
    @Column(name = "creation_date", updatable = false, nullable = false)
    private Instant createdAt;
    private String userTimezone;
    private String name;
    @Column(columnDefinition = "LONGTEXT")
    @Lob
    private String content;
    private String videoUrl;
    private Boolean active;
    @ManyToOne
    @JoinColumn(
            name = "sub_topic_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_lesson_sub_topic_id")
    )
    private SubTopic subTopic;
    private Integer orderIndex;
    private Double duration;
    private Boolean trailer;
    private Long points;

    @PrePersist
    protected void onCreate(){
        this.id = UuidGenerator.generateEntityUuid("lesson");
        this.createdAt = Instant.now();
    }
}