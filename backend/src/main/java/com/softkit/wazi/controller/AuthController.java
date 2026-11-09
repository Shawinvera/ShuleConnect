package com.softkit.wazi.controller;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.softkit.wazi.entities.AppUser;
import com.softkit.wazi.model.*;
import com.softkit.wazi.service.AppUserService;
import com.softkit.wazi.service.CookieService;
import com.softkit.wazi.service.LoginService;
import com.softkit.wazi.util.AppUserUtils;
import com.softkit.wazi.util.RequestContext;
import com.softkit.wazi.util.StringUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AppUserService userService;
    private final LoginService loginService;
    private final CookieService cookieService;

    @PostMapping("/registration")
    public ResponseEntity<?> registerUser(@RequestBody AppUserDto appUserDto) {
        return userService.registerUser(appUserDto);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            HttpServletRequest request,
            HttpServletResponse httpServletResponse,
            @RequestBody LoginDto loginDto) {
        return loginService.login(loginDto, request, httpServletResponse);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            HttpServletRequest request,
            HttpServletResponse response) {
        return loginService.logout(request, response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> tokenRefresh(
            HttpServletRequest request,
            HttpServletResponse response) {
        return loginService.tokenRefresh(request, response);
    }

    @GetMapping("/sso/{provider}")
    public void sso(@PathVariable String provider,
                    HttpServletResponse response) throws IOException {

        response.sendRedirect("/api/oauth2/authorization/" + provider);
    }

    @PostMapping("/google/login")
    public ResponseEntity<?> googleLogin(
            HttpServletRequest request,
            HttpServletResponse response,
            @RequestBody Map<String, String> tokenMap) {
        GoogleIdToken.Payload payload = loginService.googleLogin(tokenMap, request, response);
        String email = payload.getEmail();
        String name = payload.get("name").toString();

        AppUser user = userService.findByUsername(email);
        if (user == null) {
            user = userService.registerOAuth2User(email, name, "GOOGLE");
        }
        cookieService.createLoginCookie(request, response, AppUserUtils.getUserDetailsExtended(user));
        return ResponseEntity.ok().body("Login Successful");
    }

    @GetMapping("/user/email/activation")
    public void activateUser(
            @RequestParam String token,
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {
        userService.activateUserViaActivationToken(request, response, token);
    }

    @PostMapping("/user/otp/activation")
    public ResponseEntity<CustomResponse> activateUserViaOtp(
            @RequestBody OtpDto otpDto,
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {
        CustomResponse customResponse = userService.activateUserViaOtp(request, response, otpDto);
        if (customResponse.getSuccessful()) return ResponseEntity.ok(customResponse);
        return ResponseEntity.badRequest().body(customResponse);
    }

    @PutMapping("/password/reset")
    public ResponseEntity<?> resetPassword(
            @RequestBody PasswordResetDto dto
    ){
        String currentPassword = dto.getCurrentPassword();
        String newPassword=dto.getNewPassword();
        String newPasswordConfirmation = dto.getNewPasswordConfirmation();
        if (currentPassword==null || newPassword==null || newPasswordConfirmation==null){
            log.error("Password reset failed due to missing fields");
            return ResponseEntity.badRequest().body(
                    CustomResponse.builder()
                            .successful(false)
                            .errorMessage("All fields are required")
                            .build()
            );
        }
        if (!newPassword.equals(newPasswordConfirmation)){
            return ResponseEntity.badRequest().body(CustomResponse.builder()
                    .successful(false)
                    .errorMessage("newPassword and newPasswordConfirmation mismatch")
                    .build());
        }
        if (newPassword.equals(currentPassword)){
            return ResponseEntity.badRequest().body(
                    CustomResponse.builder()
                            .successful(false)
                            .errorMessage("New password cannot be the same as current password")
                            .build()
            );
        }


        ThreadData threadData = RequestContext.getThreadData();
        if (threadData==null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    CustomResponse.builder()
                            .successful(false)
                            .errorMessage("Unauthorized: You need login")
                            .build()
            );
        }
        String userId = threadData.getUserId();
        AppUser user = userService.findById(userId);
        if (user== null){
            log.error("Password reset failed for userId {}", userId);
            return ResponseEntity.badRequest().body(
                    CustomResponse.builder()
                            .successful(false)
                            .errorMessage("Password reset failed")
                            .build()
            );
        }

        Boolean isLoggedIn = loginService.passwordResetLogin(user.getUsername(), currentPassword);
        if(!isLoggedIn){
            log.error("User provided invalid credentials on password reset for userId {}", userId);
            return ResponseEntity.badRequest().body(
                    CustomResponse.builder()
                            .successful(false)
                            .errorMessage("Invalid credentials")
                            .build()
            );
        }
        CustomResponse resp= userService.resetPassword(newPassword, userId);
        if (resp.getSuccessful()) {
            return ResponseEntity.ok(resp);
        } else {
            return ResponseEntity.badRequest().body(resp);
        }
    }
}
