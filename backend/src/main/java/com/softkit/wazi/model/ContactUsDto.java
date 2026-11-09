package com.softkit.wazi.model;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class ContactUsDto {
    private String firstName;
    private String lastName;
    @NotNull
    private String email;
    private String phoneNumber;
    @NotNull
    private String data;
    @NotNull
    private String data2;
}
