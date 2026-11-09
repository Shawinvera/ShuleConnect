package com.softkit.wazi.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class GradeSubjectDetailsDto {
    private String id;
    private String subject;
    private String description;
    private Long topicCount;
    private String subjectColour;
    private String subjectIconName;
    private String gradeSubjectId;

}
