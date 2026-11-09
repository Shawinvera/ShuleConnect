package com.softkit.wazi.security;

import com.softkit.wazi.entities.AppUser;
import com.softkit.wazi.service.AppUserService;
import com.softkit.wazi.service.CookieService;
import com.softkit.wazi.service.LoginService;
import com.softkit.wazi.util.AppUserUtils;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Slf4j
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private final OAuth2UserInfoExtractor  extractor;
    private final AppUserService appUserService;
    private final CookieService cookieService;
    @Value("${wazi.frontend-dashboard-url}")
    private String waziFrontEnd;


    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
        OAuth2User oAuth2User = token.getPrincipal();
        String provider = token.getAuthorizedClientRegistrationId();
        String email = extractor.extractEmail(oAuth2User, provider);
        String name = extractor.extractName(oAuth2User, provider);

        AppUser user = appUserService.findByUsername(email);
        if (user == null) {
            user = appUserService.registerOAuth2User(email, name, provider);
        }
        cookieService.createLoginCookie(request, response, AppUserUtils.getUserDetailsExtended(user));
        
        // Determine redirect URL based on request origin
        String redirectUrl = determineRedirectUrl(request);
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }

    private String determineRedirectUrl(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        String referer = request.getHeader("Referer");
        String origin = request.getHeader("Origin");
        log.info("Determining redirect URL. User-Agent: {}, Referer: {}, Origin: {}", userAgent, referer, origin);
        
        // Check if request is from mobile app (Capacitor/Cordova)
        if (isMobileAppRequest(userAgent, referer, origin)) {
            // For mobile apps, redirect back to the Capacitor app
            // Use the same path structure as your web app
            return "capacitor://localhost/who-are-you";
        }
        
        // Default to web frontend
        return waziFrontEnd + "/who-are-you";
    }
    
    private boolean isMobileAppRequest(String userAgent, String referer, String origin) {
        // Check for Capacitor/Cordova indicators
        if (userAgent != null && (
            userAgent.contains("Capacitor") || 
            userAgent.contains("Cordova") ||
            userAgent.contains("learnplay") // Your app name
        )) {
            return true;
        }
        
        // Check for capacitor origins
        if (origin != null && (
            origin.startsWith("capacitor://") ||
            origin.startsWith("ionic://") ||
            origin.startsWith("file://")
        )) {
            return true;
        }
        
        // Check referer for mobile app indicators
        if (referer != null && (
            referer.startsWith("capacitor://") ||
            referer.startsWith("ionic://") ||
            referer.contains("localhost") && userAgent != null && userAgent.contains("Mobile")
        )) {
            return true;
        }
        
        return false;
    }
}
