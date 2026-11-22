package com.softkit.wazi.model;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LessonQuizLearnerDto {
    private String id;
    private String title;
    private String lessonId;
    private List<Question> questions;
    private Integer attemptCount;
    private Integer latestScore;
    private Integer latestPercentage;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Question {
        private String id;
        private String prompt;
        private List<String> options;
    }
}
