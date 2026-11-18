package com.softkit.wazi.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StaffNotificationDto {
    private String message;
    private String subject;
    private String phoneNumber;
}
