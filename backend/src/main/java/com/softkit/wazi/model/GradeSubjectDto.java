package com.softkit.wazi.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class GradeSubjectDto extends BaseDto {
    String gradeId;
    String subjectId;
}
