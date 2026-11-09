package com.softkit.wazi.service;

import com.softkit.wazi.entities.AppUser;
import com.softkit.wazi.model.ContactUsDto;
import com.softkit.wazi.util.HtmlTemplateUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ContactUsService {
    private final BrevoEmailService  brevoEmailService;
    public void sendContactUsEmail(@Valid ContactUsDto contactUsDto) {
        String templateName = "templates/contactUsEmail.html";
        String template = HtmlTemplateUtils.loadHtmlTemplate(templateName);

        String fullName = String.format("%s %s", contactUsDto.getFirstName(), contactUsDto.getLastName());
        String phoneNumber = contactUsDto.getPhoneNumber();
        String emailAddress = contactUsDto.getEmail();
        String dateTime = LocalDateTime.now().toString();
        String refNumber = String.format("WAZI-%s", UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        String data = contactUsDto.getData();
        String data2 = contactUsDto.getData2();
        String inquiry= "";
        if (data != null) {
            inquiry = data + " - "+data2;
        }else {
            inquiry = data2;
        }
        String htmlContent = template
                .replace("{{name}}", fullName)
                .replace("{{FullName}}", fullName)
                .replace("{{PhoneNumber}}", phoneNumber)
                .replace("{{EmailAddress}}", emailAddress)
                .replace("{{DateTime}}", dateTime)
                .replace("{{RefNumber}}", refNumber)
                .replace("{{Inquiry}}", inquiry);

        AppUser appUser = AppUser.builder()
                .firstName(contactUsDto.getFirstName())
                .lastName(contactUsDto.getLastName())
                .username(contactUsDto.getEmail())
                .build();

        brevoEmailService.sendEmail(appUser, "Request acknowledgement", htmlContent);

    }
}
