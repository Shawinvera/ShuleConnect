package com.softkit.wazi.model;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LessonQuizCreateDto {
    private String lessonId;
    private String title;
    private List<Question> questions;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Question {
        private String prompt;
        private List<String> options;
        private Integer correctOptionIndex;
    }
}
