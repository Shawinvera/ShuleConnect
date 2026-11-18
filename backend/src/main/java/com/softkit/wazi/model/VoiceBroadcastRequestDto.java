package com.softkit.wazi.model;

import lombok.*;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class VoiceBroadcastRequestDto {
    private List<String> phoneNumbers;
    private String message;
}
