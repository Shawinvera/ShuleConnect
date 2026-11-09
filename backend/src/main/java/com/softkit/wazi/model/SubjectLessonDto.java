package com.softkit.wazi.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SubjectLessonDto {
    private String id;
    private String name;
    private String content;
    private String videoUrl;
    private Boolean active;
    private Integer orderIndex;
    private Double duration;
    private Boolean trailer;
    private String subTopicId;
    private String subTopicName;
    private Integer subTopicOrderIndex;
    private String topicId;
    private String topicName;
    private Integer topicOrderIndex;
    private Long points;
    private Boolean learnerCompleted;
}
