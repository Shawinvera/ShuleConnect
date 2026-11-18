package com.softkit.wazi.controller;

import com.softkit.wazi.service.USSDService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/public/at")
@RequiredArgsConstructor
public class USSDController {

    private final USSDService ussdService;

    /**
     * AfricasTalking USSD callback endpoint.
     * AT posts form-encoded params; response must be plain text starting with CON or END.
     */
    @PostMapping(
            value = "/ussd",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
            produces = MediaType.TEXT_PLAIN_VALUE
    )
    public ResponseEntity<String> handleUssd(
            @RequestParam String sessionId,
            @RequestParam String serviceCode,
            @RequestParam String phoneNumber,
            @RequestParam(required = false, defaultValue = "") String text) {

        String response = ussdService.processUssd(sessionId, serviceCode, phoneNumber, text);
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .body(response);
    }
}
