package com.softkit.wazi.enums;

public enum CookieName {
    ACCESS_TOKEN("accessToken"),
    REFRESH_TOKEN("refreshToken");
    private final String code;

    CookieName(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
