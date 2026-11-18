package com.softkit.wazi.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.softkit.wazi.model.AirtimeRecipient;
import com.softkit.wazi.util.StringUtils;
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

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirtimeService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${africastalking.api-key}")
    private String africastalkingApiKey;
    @Value("${africastalking.username}")
    private String africastalkingUsername;
    @Value("${africastalking.airtime-url}")
    private String airtimeUrl;

    // -------------------------------------------------------------------------
    // Core airtime send methods
    // -------------------------------------------------------------------------

    @Async("asyncTaskExecutor")
    public void rewardAirtime(String phoneNumber, String currencyCode, String amount) {
        if (StringUtils.isDevMode()) {
            log.info("DEV mode - skipping AT airtime call to {}", phoneNumber);
            return;
        }

        // Ensure phone number has + prefix
        if (phoneNumber != null && !phoneNumber.startsWith("+")) {
            phoneNumber = "+" + phoneNumber;
        }

        try {
            // AT requires amount format: "KES 5" (currency + space + amount)
            String atAmount = currencyCode + " " + amount;
            List<Map<String, String>> recipientList = List.of(
                    Map.of("phoneNumber", phoneNumber, "currencyCode", currencyCode, "amount", atAmount)
            );
            String recipientsJson = objectMapper.writeValueAsString(recipientList);
            log.info("Sending airtime — phone:{} amount:{}", phoneNumber, atAmount);
            postAirtime(recipientsJson);
        } catch (JsonProcessingException e) {
            log.error("Error serializing airtime recipients: {}", e.getMessage());
        }
    }

    @Async("asyncTaskExecutor")
    public void rewardBulkAirtime(List<AirtimeRecipient> recipients) {
        if (StringUtils.isDevMode()) {
            log.info("DEV mode - skipping AT call");
            return;
        }

        try {
            // AT requires amount as "KES 10" format — combine currencyCode + amount
            List<Map<String, String>> atRecipients = recipients.stream()
                    .map(r -> {
                        String phone = r.getPhoneNumber();
                        if (phone != null && !phone.startsWith("+")) phone = "+" + phone;
                        String atAmount = r.getCurrencyCode() + " " + r.getAmount();
                        return Map.of("phoneNumber", phone, "currencyCode", r.getCurrencyCode(), "amount", atAmount);
                    })
                    .toList();
            String recipientsJson = objectMapper.writeValueAsString(atRecipients);
            log.info("Sending bulk airtime to {} recipients", atRecipients.size());
            postAirtime(recipientsJson);
        } catch (JsonProcessingException e) {
            log.error("Error serializing bulk airtime recipients: {}", e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Reward convenience methods
    // -------------------------------------------------------------------------

    @Async("asyncTaskExecutor")
    public void rewardAttendance(String phoneNumber) {
        log.info("Rewarding attendance airtime to {}", phoneNumber);
        rewardAirtime(phoneNumber, "KES", "5");
    }

    @Async("asyncTaskExecutor")
    public void rewardQuizCompletion(String phoneNumber, int score) {
        String amount = score >= 80 ? "10" : "5";
        log.info("Rewarding quiz completion airtime to {} — score:{} amount:KES {}", phoneNumber, score, amount);
        rewardAirtime(phoneNumber, "KES", amount);
    }

    @Async("asyncTaskExecutor")
    public void rewardCourseCompletion(String phoneNumber) {
        log.info("Rewarding course completion airtime to {}", phoneNumber);
        rewardAirtime(phoneNumber, "KES", "20");
    }

    // -------------------------------------------------------------------------
    // Internal helper
    // -------------------------------------------------------------------------

    private void postAirtime(String recipientsJson) {
        log.info("Sending airtime via AT — URL: {}, Username: {}, Recipients: {}",
                airtimeUrl, africastalkingUsername, recipientsJson);

        HttpHeaders headers = new HttpHeaders();
        headers.add("apiKey", africastalkingApiKey);
        headers.add("Accept", "application/json");
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("username", africastalkingUsername);
        body.add("recipients", recipientsJson);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            String response = restTemplate.postForObject(airtimeUrl, requestEntity, String.class);
            log.info("AT Airtime response: {}", response);
        } catch (Exception e) {
            log.error("Error sending airtime via Africa's Talking: {}", e.getMessage());
        }
    }
}
