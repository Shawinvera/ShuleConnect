package com.softkit.wazi.model;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Setter
@Getter
public abstract class BaseDto {
    private String id;
    private Instant createdAt;
    private String userTimezone;
}
