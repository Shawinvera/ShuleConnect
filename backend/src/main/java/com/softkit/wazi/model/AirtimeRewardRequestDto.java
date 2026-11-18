package com.softkit.wazi.model;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AirtimeRewardRequestDto {
    private String phoneNumber;
    private RewardType type;
    private int score;

    public enum RewardType {
        ATTENDANCE,
        QUIZ,
        COURSE
    }
}
