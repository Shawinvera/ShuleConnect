package com.softkit.wazi.model;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import jakarta.persistence.Column;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public class CourseDto {
    private String id;
    private Instant createdAt;
    private String userTimezone;

    @NotBlank(message = "title is mandatory")
    @NotNull(message = "title cannot be null")
    private String title;

    @NotBlank(message = "countryCode is mandatory")
    @NotNull(message = "countryCode cannot be null")
    private String countryCode;

    private Boolean premium;
    private String description;
    private Boolean active;
    private String shortCode;
}
