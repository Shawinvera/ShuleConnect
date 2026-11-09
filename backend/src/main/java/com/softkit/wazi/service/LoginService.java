package com.softkit.wazi.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.softkit.wazi.model.LoginDto;
import com.softkit.wazi.model.UserDetailsExtended;
import com.softkit.wazi.util.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class LoginService {
    private final RateLimiterService rateLimiterService;
    private final AuthenticationManager authManager;
    private final CookieService cookieService;

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String clientId;

    public ResponseEntity<?> login(
            LoginDto loginDto,
            HttpServletRequest httpRequest,
            HttpServletResponse httpServletResponse){

        String ipAddress = httpRequest.getRemoteAddr();
        String username = loginDto.getUsername();
        String password = loginDto.getPassword();
        //check if username and password are provided
        if (StringUtils.isNullOrEmpty(username) || StringUtils.isNullOrEmpty(password)) {
            return ResponseUtils.createErrorResponse(
                    httpRequest,
                    "MISSING_CREDENTIALS",
                    "Username and password are required.",
                    400
            );
        }
        log.info("Login attempt for username: {} from IP: {}", username, ipAddress);

        //check if the user is blocked
        if(!rateLimiterService.tryConsumeIp(ipAddress) || !rateLimiterService.tryConsumeUsername(username)){
            return ResponseUtils.createErrorResponse(
                    httpRequest,
                    "TOO_MANY_ATTEMPTS",
                    "Too many login attempts. Please try again later.",
                    429
            );
        }

        try{
            Authentication authentication = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
            );
            UserDetailsExtended userDetails = (UserDetailsExtended) authentication.getPrincipal();
            assert userDetails != null;
            if (!userDetails.getActivated()) {
                return ResponseUtils.createErrorResponse(
                        httpRequest,
                        "ACCOUNT_NOT_ACTIVATED",
                        "Your account is not activated. Please check your email/phone for activation instructions.",
                        403
                );
            }
            cookieService.createLoginCookie(httpRequest, httpServletResponse, userDetails);

            return ResponseEntity.ok().body("Login Successful");


        }catch (Exception e){
            return ResponseUtils.createErrorResponse(
                    httpRequest,
                    "INVALID_CREDENTIALS",
                    "login failed",
                    401
            );
        }

    }

    public Boolean passwordResetLogin(
            String username, String password){

        try{
            Authentication authentication = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
            );
            return true;
        }catch (Exception e){
            return false;
        }

    }

    //Logout functionality to remove all cookies and invalidate the token
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        cookieService.logout(request, response);
        return ResponseEntity.ok("Logged out successfully");
    }

    public ResponseEntity<?> tokenRefresh(HttpServletRequest request, HttpServletResponse response) {
        return cookieService.tokenRefresh(request, response);
    }

    public GoogleIdToken.Payload googleLogin(
            Map<String, String> tokenMap,
            HttpServletRequest request,
            HttpServletResponse httpServletResponse) {
        String token = tokenMap.get("token");
        if (StringUtils.isNullOrEmpty(token)) {
            return null;
        }
        try {
            return verifyToken(token);
        } catch (Exception e) {
            log.error("Exception occurred while verifying token", e);
        }

        return null;
    }

    private GoogleIdToken.Payload verifyToken(String idToken) throws Exception {
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), new GsonFactory())
                .setAudience(Collections.singletonList(clientId))
                .build();

        GoogleIdToken token = verifier.verify(idToken);
        if (token == null) {
            return null;
        }
        return token.getPayload();
    }
}
