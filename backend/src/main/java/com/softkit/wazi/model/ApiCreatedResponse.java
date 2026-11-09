package com.softkit.wazi.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ApiCreatedResponse {
    private Instant timestamp;
    private String generatedId;
    private String message;
}
