package com.softkit.wazi.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LessonQuizSummaryDto {
    private String id;
    private String title;
    private String lessonId;
    private String lessonName;
    private Integer questionCount;
}
