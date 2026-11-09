package com.softkit.wazi.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SubjectLessonTrailDto {
    private String id;
    private String name;
    private Boolean trailer;
    private String subTopicId;
    private String subTopicName;
    private String topicId;
    private String topicName;
    private String subjectId;
    private String subjectName;
    private Boolean completed;
    private Long lessonPoints;
}
