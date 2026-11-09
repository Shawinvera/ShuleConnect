package com.softkit.wazi.model;

import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDateTime;

@MappedSuperclass
@Setter
@Getter
public abstract class BaseDto {
    private String id;
    private Instant createdAt;
    private String userTimezone;
}
