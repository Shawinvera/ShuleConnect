package com.softkit.wazi.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LessonQuizLessonOptionDto {
    private String id;
    private String lessonName;
    private String subjectName;
    private String topicName;
    private String subTopicName;
}
