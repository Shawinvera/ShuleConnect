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
public class SubTopicDto extends BaseDto {

    @NotEmpty(message = "name cannot be empty")
    @NotNull(message = "name cannot be null")
    private String name;

    @NotEmpty(message = "description cannot be empty")
    @NotNull(message = "description cannot be null")
    private String description;
    private Boolean active;

    @NotEmpty(message = "topicId cannot be empty")
    @NotNull(message = "topicId cannot be null")
    private String topicId;
    private Integer orderIndex;
}
