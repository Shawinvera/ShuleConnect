package com.softkit.wazi.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String message;
    private String userId;
    private String username;
    private String role;
    private String firstName;
    private String lastName;
}
