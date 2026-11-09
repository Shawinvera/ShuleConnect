package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Table(
        name = "sub_topics",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "unique_topic_subtopic_name",
                        columnNames = {"name", "topic_id"}
                )
        }
)
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Builder
public class SubTopic   {
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
            name = "topic_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_subtopic_topic_id")
    )
    private Topic topic;
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "subTopic")
    private List<Lesson> lessons;
    private Boolean active;
    private Integer orderIndex;

    @PrePersist
    protected void onCreate(){
        this.id = UuidGenerator.generateEntityUuid("subtopic");
        this.createdAt = Instant.now();
    }
}
