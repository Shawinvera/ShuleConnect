package com.softkit.wazi.security;

import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;

@Component
public class OAuth2UserInfoExtractor {

    public String extractEmail(OAuth2User user, String provider) {

        return switch (provider.toUpperCase()) {
            case "GOOGLE" -> user.getAttribute("email");
            case "MICROSOFT" -> user.getAttribute("email");
            case "APPLE" -> user.getAttribute("email");
            default -> throw new IllegalArgumentException("Unsupported provider");
        };
    }

    public String extractName(OAuth2User user, String provider) {

        return switch (provider.toUpperCase()) {
            case "GOOGLE" -> user.getAttribute("name");
            case "MICROSOFT" -> user.getAttribute("name");
            case "APPLE" -> "Apple User"; // Apple may not always send name
            default -> "User";
        };
    }
}
