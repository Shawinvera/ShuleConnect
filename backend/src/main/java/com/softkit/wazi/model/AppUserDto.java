package com.softkit.wazi.model;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public class AppUserDto extends BaseDto {
    private String username;
    private String password;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String profilePicture;
    private String role;
    private String countryCode;

}
