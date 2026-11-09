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
public class SubjectDto extends BaseDto {
    @NotEmpty(message = "name cannot be empty")
    @NotNull(message = "name cannot be null")
    private String name;

    @NotEmpty(message = "description cannot be empty")
    @NotNull(message = "description cannot be null")
    private String description;
    private Boolean active;
    @NotEmpty(message = "iconName cannot be empty")
    @NotNull(message = "iconName cannot be null")
    private String iconName;
    @NotEmpty(message = "courseId cannot be empty")
    @NotNull(message = "courseId cannot be null")
    private String courseId;
    @NotEmpty(message = "colour cannot be empty")
    @NotNull(message = "colour cannot be null")
    private String colour;
}
