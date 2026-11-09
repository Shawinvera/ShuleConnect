package com.softkit.wazi.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class LessonTrackerDto
        extends BaseDto
{
    private String id;
    private String learnerId;
    private String lessonId;
    private Instant completedAt;
    private String lessonName;
    private String subjectName;
    private Long points;
}
