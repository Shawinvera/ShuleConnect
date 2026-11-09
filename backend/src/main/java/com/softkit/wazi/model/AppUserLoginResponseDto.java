package com.softkit.wazi.model;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AppUserLoginResponseDto  {
    private String id;
    private Instant createdAt;
    private String userTimezone;
    private String username;
    private String firstName;
    private String lastName;
    private String role;
    private String phoneNumber;
    private List<LearnerDto> learners;

}
