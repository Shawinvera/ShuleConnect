package com.softkit.wazi.model;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class TopicDto extends BaseDto {

    @NotEmpty(message = "name cannot be empty")
    @NotNull(message = "name cannot be null")
    private String name;

    @NotEmpty(message = "description cannot be empty")
    @NotNull(message = "description cannot be null")
    private String description;
    private Boolean active;

    @NotEmpty(message = "gradeSubjectId cannot be empty")
    @NotNull(message = "gradeSubjectId cannot be null")
    private String gradeSubjectId;

    private Integer orderIndex;
}
