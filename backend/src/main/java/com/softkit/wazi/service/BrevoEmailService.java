package com.softkit.wazi.service;
import com.softkit.wazi.entities.AppUser;
import com.softkit.wazi.model.BrevoEmailDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BrevoEmailService {
    @Value("${brevo.senderEmail}")
    private String senderEmail;
    @Value("${brevo.senderName}")
    private String senderName;
    @Value("${brevo.apiUrl}")
    private String brevoApiUrl;
    @Value("${brevo.apiKey}")
    private String brevoApiKey;
    private final RestTemplate restTemplate;

    @Async("asyncTaskExecutor")
    public void sendEmail(AppUser appUser, String subject, String htmlContent) {
        BrevoEmailDto.EmailAddress sender = new BrevoEmailDto.EmailAddress(senderEmail, senderName);
        BrevoEmailDto.MessageVersion messageVersion = BrevoEmailDto.MessageVersion
                .builder()
                .to(List.of(new BrevoEmailDto.EmailAddress(appUser.getUsername(), appUser.getFirstName())))
                .htmlContent(htmlContent)
                .subject(subject)
                .build();
        BrevoEmailDto emailDto = new BrevoEmailDto(sender, subject, htmlContent, List.of(messageVersion));

        HttpHeaders headers = new HttpHeaders();
        headers.set("api-key", brevoApiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        HttpEntity<BrevoEmailDto> requestEntity = new HttpEntity<>(emailDto, headers);
        try {
            ResponseEntity<String> responseEntity = restTemplate.postForEntity(brevoApiUrl, requestEntity, String.class);
        } catch (RestClientException e) {
            log.error("Error while sending email address - {}", e.getMessage());
        }

    }
}
