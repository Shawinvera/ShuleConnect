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
public class GradeSubjectTopicSummaryDto {
    private String id;
    private String subject;
    private String description;
    private Boolean active;
    private Instant createdAt;
    private String userTimezone;
    private Long topicCount;

}
