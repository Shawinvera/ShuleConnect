package com.softkit.wazi.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LessonQuizResultDto {
    private Integer score;
    private Integer questionCount;
    private Integer percentage;
    private Boolean passed;
    private Integer attemptCount;
}
