package com.softkit.wazi.model;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ATSmsRequestDto {
    private String phoneNumber;
    private String message;
}
