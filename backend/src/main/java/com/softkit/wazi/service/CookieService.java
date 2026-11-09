package com.softkit.wazi.service;

import com.softkit.wazi.entities.AppUser;
import com.softkit.wazi.enums.CookieName;
import com.softkit.wazi.event.CommunicationEvent;
import com.softkit.wazi.model.UserDetailsExtended;
import com.softkit.wazi.util.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CookieService {
    public static final String AUTH_REFRESH = "/auth/refresh";
    private final JwtService jwtService;
    private final SecureTokenGenerator secureTokenGenerator;
    String accessTokenCode = CookieName.ACCESS_TOKEN.getCode();
    String refreshTokenCode = CookieName.REFRESH_TOKEN.getCode();
    private final AppUserService appUserService;


    // Trusted PWA origins that require SameSite=None for iOS compatibility
    private static final List<String> TRUSTED_PWA_ORIGINS = Arrays.asList(
        "https://69f9a4d68419ebd5ddb100a9--jade-capybara-e69f44.netlify.app", //netlify url
        "https://app.learnplay.com", // update to the app url
        "https://learnplay.app", // update to the app url
        "https://wazi-ten.vercel.app" // vercel url
    );

    public void createLoginCookie(
            HttpServletRequest httpRequest,
            HttpServletResponse httpServletResponse,
            UserDetailsExtended userDetails) {
        String isStrictCookie = getCookieStrictValue(httpRequest);
        String tokenId = UuidGenerator.generateEntityUuid("tid");
        String token = jwtService.generateAccessToken(userDetails, tokenId);
        String rawToken = secureTokenGenerator.generateToken();
        String hashedToken = secureTokenGenerator.hashToken(rawToken);
        Instant refreshTokenExpiry = Instant.now().plus(7, ChronoUnit.DAYS);
        appUserService.updateSuccessfullyLoggedIn(tokenId, Instant.now(), hashedToken,refreshTokenExpiry, userDetails.getId());

        // Log the cookie policy being used for debugging
        log.info("Creating login cookie with SameSite policy: {} for origin: {}", 
                isStrictCookie, httpRequest.getHeader("Origin"));

        ResponseCookie cookie = ResponseCookie.from(accessTokenCode, token)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(Duration.ofMinutes(60))
                .sameSite(isStrictCookie)
                .build();
        String contextPath = httpRequest.getContextPath();

        //refresh token cookie
        ResponseCookie refreshTokenCookie = ResponseCookie.from("refreshToken", rawToken)
                .httpOnly(true)
                .secure(true)
                .path(contextPath+ AUTH_REFRESH)
                .maxAge(Duration.ofDays(7))
                .sameSite(isStrictCookie)
                .build();

        httpServletResponse.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        httpServletResponse.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString());
    }

    /**
     * Determines the appropriate SameSite cookie policy based on the request origin.
     * Uses SameSite=None for trusted PWA origins (required for iOS Safari PWA)
     * and SameSite=Strict for regular web requests (maximum security).
     */
    private static @NonNull String getCookieStrictValue(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        String referer = request.getHeader("Referer");
        
        // Check if request is from a trusted PWA origin
        boolean isTrustedPWA = TRUSTED_PWA_ORIGINS.stream()
            .anyMatch(trustedOrigin -> 
                (origin != null && origin.equals(trustedOrigin)) ||
                (referer != null && referer.startsWith(trustedOrigin))
            );
        
        // Special handling for Capacitor apps (Android APK)
        boolean isCapacitor = origin != null && origin.startsWith("capacitor://");
        
        if (isTrustedPWA || isCapacitor) {
            return "None";  // Required for cross-origin PWA requests
        }
        
        // Default to Strict for maximum security on regular web requests
        if (!StringUtils.isDevMode()) {
            return "Strict";
        }
        
        return "None";  // Dev mode
    }

    /**
     * Legacy method for backward compatibility - now uses request-aware version
     */
    private static @NonNull String getCookieStrictValue() {
        // Fallback to None when request context is not available
        return "None";
    }

    //Logout functionality to remove all cookies and invalidate the token
    public void logout(HttpServletRequest request, HttpServletResponse response) {

        String isStrictCookie = getCookieStrictValue(request);
        //remove cookies
        ResponseCookie cookie = ResponseCookie.from(accessTokenCode, "")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(0)
                .sameSite(isStrictCookie)
                .build();
        String contextPath = request.getContextPath();
        ResponseCookie refreshTokenCookie = ResponseCookie.from(refreshTokenCode, "")
                .httpOnly(true)
                .secure(true)
                .path(contextPath+ AUTH_REFRESH)
                .maxAge(0)
                .sameSite(isStrictCookie)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString());

    }

    public ResponseEntity<?> tokenRefresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = HttpRequestUtils.getAccessTokenFromCookie(request, refreshTokenCode);
        String isStrictCookie = getCookieStrictValue(request);
        String userId = null;
        try {
            String accessToken = HttpRequestUtils.getAccessTokenFromCookie(request, accessTokenCode);
            userId = jwtService.extractSpecificKey(accessToken, "uid");
        } catch (Exception e) {
            log.error("Error extracting user ID from access token: {}", e.getMessage());
        }
        if (refreshToken == null || userId == null) {
            return ResponseUtils.createErrorResponse(
                    request,
                    "INVALID_REFRESH_TOKEN",
                    "Invalid refresh token.",
                    400
            );
        }
        String hashedToken = secureTokenGenerator.hashToken(refreshToken);
        List<AppUser> usersList = appUserService.findByRefreshToken(hashedToken);

        //filter user with matching userId
        String finalUserId = userId;
        List<AppUser> filteredUser = usersList.stream()
                .filter(user -> user.getId().equals(finalUserId))
                .toList();
        if (filteredUser.isEmpty()) {
            return ResponseUtils.createErrorResponse(
                    request,
                    "INVALID_REFRESH_TOKEN",
                    "Invalid refresh token.",
                    401
            );
        }
        AppUser user = filteredUser.get(0);

        if (user.getRefreshTokenExpiry().isBefore(Instant.now())) {
            return ResponseUtils.createErrorResponse(
                    request,
                    "EXPIRED_REFRESH_TOKEN",
                    "Refresh token has expired. Please log in again.",
                    401
            );
        }
        UserDetailsExtended userDetails = UserDetailsExtended.builder()
                .id(user.getId())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .build();
        String newAccessToken = jwtService.generateAccessToken(userDetails, user.getTokenId());
        ResponseCookie cookie = ResponseCookie.from(accessTokenCode, newAccessToken)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(Duration.ofMinutes(60))
                .sameSite(isStrictCookie)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok("Access token refreshed successfully");
    }

    @EventListener
    @Async
    public void consumeEvent(CommunicationEvent event){
        log.info("CookieService - Received event with message: {}", event.getMessage());
    }
}
