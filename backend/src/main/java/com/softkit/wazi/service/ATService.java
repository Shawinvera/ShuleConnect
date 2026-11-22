package com.softkit.wazi.service;

import com.softkit.wazi.util.StringUtils;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class ATService {
    private final RestTemplate restTemplate;

    @Value("${africastalking.api-key}")
    private String africastalkingApikKey;
    @Value("${africastalking.username}")
    private String africastalkingUsername;
    @Value("${africastalking.api-url}")
    private String africastalkingApi;
    @Value("${africastalking.voice-url}")
    private String voiceUrl;
    @Value("${africastalking.voice-callback-url}")
    private String voiceCallbackUrl;
    @Value("${africastalking.caller-id}")
    private String callerId;

    /** In-memory store: phone → TTS message, consumed by voice callback. */
    private final ConcurrentHashMap<String, String> voiceMessages = new ConcurrentHashMap<>();

    // -------------------------------------------------------------------------
    // Existing method
    // -------------------------------------------------------------------------

    @Async("asyncTaskExecutor")
    public void sendSms(String to, String message) throws MessagingException {
        if (StringUtils.isDevMode()) {
            log.info("DEV mode - skipping AT SMS call");
            return;
        }

        log.info("Sending SMS to {} via Africa's Talking", to);

        HttpHeaders headers = new HttpHeaders();
        headers.add("apiKey", africastalkingApikKey);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("to", to);
        body.add("message", message);
        body.add("username", africastalkingUsername);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            String response = restTemplate.postForObject(africastalkingApi, requestEntity, String.class);
            log.info("AT SMS response: {}", response);
        } catch (Exception e) {
            log.error("Error Sending SMS to Africa's Talking: {}", e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // SMS lesson / reminder helpers
    // -------------------------------------------------------------------------

    @Async("asyncTaskExecutor")
    public void sendDailyLesson(String phoneNumber, String lessonTitle, String lessonSummary) throws MessagingException {
        if (StringUtils.isDevMode()) {
            log.info("DEV mode - skipping AT call");
            return;
        }
        String message = "Daily Lesson: " + lessonTitle + "\n" + lessonSummary;
        sendSms(phoneNumber, message);
    }

    @Async("asyncTaskExecutor")
    public void sendAssignmentReminder(String phoneNumber, String assignmentTitle, Instant deadline) throws MessagingException {
        if (StringUtils.isDevMode()) {
            log.info("DEV mode - skipping AT call");
            return;
        }
        String message = "Assignment due: " + assignmentTitle + " by " + deadline;
        sendSms(phoneNumber, message);
    }

    @Async("asyncTaskExecutor")
    public void sendExamReminder(String phoneNumber, String examName, Instant examDate) throws MessagingException {
        if (StringUtils.isDevMode()) {
            log.info("DEV mode - skipping AT call");
            return;
        }
        String message = "Exam reminder: " + examName + " on " + examDate;
        sendSms(phoneNumber, message);
    }

    @Async("asyncTaskExecutor")
    public void sendTimetableChange(String phoneNumber, String subject, String oldTime, String newTime) throws MessagingException {
        if (StringUtils.isDevMode()) {
            log.info("DEV mode - skipping AT call");
            return;
        }
        String message = "Timetable: " + subject + " moved from " + oldTime + " to " + newTime;
        sendSms(phoneNumber, message);
    }

    @Async("asyncTaskExecutor")
    public void notifyTeacher(String phoneNumber, String message) throws MessagingException {
        if (StringUtils.isDevMode()) {
            log.info("DEV mode - skipping AT call");
            return;
        }
        sendSms(phoneNumber, message);
    }

    @Async("asyncTaskExecutor")
    public void sendBulkSms(List<String> phoneNumbers, String message) throws MessagingException {
        if (StringUtils.isDevMode()) {
            log.info("DEV mode - skipping AT call");
            return;
        }

        String to = String.join(",", phoneNumbers);

        HttpHeaders headers = new HttpHeaders();
        headers.add("apiKey", africastalkingApikKey);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("to", to);
        body.add("message", message);
        body.add("username", africastalkingUsername);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            restTemplate.postForObject(africastalkingApi, requestEntity, String.class);
        } catch (Exception e) {
            log.error("Error sending bulk SMS to Africa's Talking: {}", e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Voice methods
    // -------------------------------------------------------------------------

    @Async("asyncTaskExecutor")
    public void makeVoiceCall(String toPhone, String message) {
        if (StringUtils.isDevMode()) {
            log.info("DEV mode - skipping AT call");
            return;
        }

        // Store the message so the callback endpoint can serve the right TTS text
        if (message != null) {
            voiceMessages.put(toPhone, message);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.add("apiKey", africastalkingApikKey);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("username", africastalkingUsername);
        body.add("from", callerId);
        body.add("to", toPhone);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            restTemplate.postForObject(voiceUrl, requestEntity, String.class);
        } catch (Exception e) {
            log.error("Error making voice call via Africa's Talking: {}", e.getMessage());
        }
    }

    public void makeVoiceBroadcast(List<String> phoneNumbers, String message) {
        if (StringUtils.isDevMode()) {
            log.info("DEV mode - skipping AT call");
            return;
        }
        if (phoneNumbers == null || phoneNumbers.isEmpty()) {
            log.warn("No phone numbers provided for voice broadcast");
            return;
        }
        for (String phone : phoneNumbers) {
            makeVoiceCall(phone, message);
        }
    }

    /** Returns the TTS message stored for the given phone number (used by voice callback). */
    public String getVoiceMessage(String phone) {
        return voiceMessages.getOrDefault(phone,
                "Welcome to ShuleConnect. Please check the app for details. Thank you.");
    }
}
