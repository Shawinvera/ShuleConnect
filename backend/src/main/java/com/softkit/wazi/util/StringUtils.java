package com.softkit.wazi.util;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber;

import java.time.ZoneId;
import java.util.Random;

public class StringUtils {
    public static Boolean isNullOrEmpty(String string) {
        return string == null || string.isEmpty();
    }



    public static String getTimezone(String timezone) {
        if (timezone == null || timezone.isEmpty()) {
            timezone = ZoneId.systemDefault().toString();
        }
        return timezone;
    }

    public static boolean isValidEmail(String email) {
        if (email == null || email.isEmpty()) {
            return false;
        }
        return email.contains("@");
    }

    /**
     *
     * @param length
     * @return
     */
    public static String generateOtp(Integer length, String username) {
        if (length == null || length <= 0) {
            throw new IllegalArgumentException("Length must be positive");
        }

        //check if username is an email address
        boolean isEmail = isValidEmail(username);
        boolean isDev = isDevMode();


        //Default the otp to 9999 if is mobile and DEV environments
        if(isDev && !isEmail) return "9999";

        int min = (int) Math.pow(10, length - 1);
        int max = (int) Math.pow(10, length) - 1;
        Random random = new Random();
        int otp = random.nextInt((max - min) + 1) + min;
        return String.valueOf(otp);
    }

    public static boolean isDevMode() {
        String activeProfile = System.getenv("SPRING_PROFILES_ACTIVE");
        if (isNullOrEmpty(activeProfile)) {return false;}
        return activeProfile.contains("dev");
    }

    public static boolean isValidPhoneNumber(String value) {
        if (value == null || value.isEmpty()) return true; // Let @NotBlank handle empty strings

        PhoneNumberUtil phoneUtil = PhoneNumberUtil.getInstance();
        try {
            // "ZZ" is a generic region code for numbers starting with "+" (E.164)
            Phonenumber.PhoneNumber number = phoneUtil.parse(value, "ZZ");
            return phoneUtil.isValidNumber(number);
        } catch (NumberParseException e) {
            return false;
        }
    }

    public static String formatPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            return phoneNumber;
        }
        PhoneNumberUtil phoneUtil = PhoneNumberUtil.getInstance();
        try {
            return phoneNumber.startsWith("+") ? phoneNumber : phoneUtil.format(phoneUtil.parse(phoneNumber, "ZZ"), PhoneNumberUtil.PhoneNumberFormat.E164);
        } catch (NumberParseException e) {
            return phoneNumber;
        }
    }

    public static String trimString(String string) {
        if (string == null) return null;
        return string.trim();
    }
}
