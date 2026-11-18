package com.softkit.wazi.model;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class USSDRequest {
    private String sessionId;
    private String serviceCode;
    private String phoneNumber;
    private String text;
}
