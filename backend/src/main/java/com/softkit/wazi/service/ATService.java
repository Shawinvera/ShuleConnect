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

    @Async("asyncTaskExecutor")
    public void sendSms(String to, String message) throws MessagingException {
        //We don't need to send OTP if we are in DEV
        if (StringUtils.isDevMode()) return;

        //make a post request submitting form-data with api-key header to SMS Provider(Africastalking)
        //Create HTTP Headers
        HttpHeaders headers = new HttpHeaders();
        headers.add("apiKey", africastalkingApikKey);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);


        //generate form-data
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("to", to);
        body.add("message", message);
        body.add("username", africastalkingUsername);

        //create the request entity
        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            restTemplate.postForObject(africastalkingApi, requestEntity, String.class);
        } catch (Exception e) {
            log.error("Error Sending SMS to Africa's Talking: {}", e.getMessage());
        }
    }

}
