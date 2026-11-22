package com.softkit.wazi.model;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
public class LessonQuizSubmissionDto {
    private String learnerId;
    private Map<String, Integer> answers;
}
