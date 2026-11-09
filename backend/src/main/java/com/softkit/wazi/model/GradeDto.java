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
public class GradeDto extends BaseDto {

    @NotEmpty(message = "name cannot be empty")
    @NotNull(message = "name cannot be null")
    String name;
    @NotEmpty(message = "description cannot be empty")
    @NotNull(message = "description cannot be null")
    String description;
    Boolean active;
    @NotEmpty(message = "courseId cannot be empty")
    @NotNull(message = "courseId cannot be null")
    String courseId;
}
