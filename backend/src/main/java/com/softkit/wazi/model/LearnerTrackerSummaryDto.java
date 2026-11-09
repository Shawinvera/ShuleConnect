package com.softkit.wazi.model;

import lombok.*;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class LearnerTrackerSummaryDto {
    private String learnerId;
    private Long lessonCount;
    private Integer streak;
    private Long lessonCompletedCount;
    private Double percentageCompleted;
    private Long points;
    private List<SubjectSummary> subjects;

    @Data
    @Builder
    public static class SubjectSummary {
        private String id;
        private String name;
        private Long topicCount;
        private Long subTopicCount;
        private Long lessonCount;
        private Long lessonCompletedCount;
        private Double percentageCompleted;
        private String colour;
        private  String iconName;
        private Long points;
    }
}
