package com.softkit.wazi.model;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PasswordResetDto {
    private String username;
    @NotEmpty(message = "newPassword cannot be empty")
    private String newPassword;
    @NotEmpty(message = "newPasswordConfirmation cannot be empty")
    private String newPasswordConfirmation;
    @NotEmpty(message = "passwordResetToken cannot be empty")
    private String passwordResetToken;
    private String currentPassword;
    private String otp;
}
