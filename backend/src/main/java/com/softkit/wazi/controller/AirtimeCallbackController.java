package com.softkit.wazi.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/public/at/airtime")
@RequiredArgsConstructor
@Slf4j
public class AirtimeCallbackController {

    /**
     * AT Validation callback — called BEFORE airtime is sent.
     * Respond "Validated" to approve or "Validation Failed" to reject.
     */
    @PostMapping(
        value = "/validate",
        consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
        produces = MediaType.TEXT_PLAIN_VALUE
    )
    public ResponseEntity<String> validateAirtime(
            @RequestParam(required = false) String transactionId,
            @RequestParam(required = false) String phoneNumber,
            @RequestParam(required = false) String currencyCode,
            @RequestParam(required = false) String amount) {

        log.info("AT Airtime validation — txId:{} phone:{} amount:{} {}",
                transactionId, phoneNumber, amount, currencyCode);

        // Always approve — add fraud checks here if needed
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .body("Validated");
    }

    /**
     * AT Status callback — called AFTER airtime is sent.
     * AT notifies you of success or failure.
     */
    @PostMapping(
        value = "/status",
        consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE
    )
    public ResponseEntity<Void> airtimeStatus(
            @RequestParam(required = false) String transactionId,
            @RequestParam(required = false) String phoneNumber,
            @RequestParam(required = false) String currencyCode,
            @RequestParam(required = false) String amount,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String errorMessage,
            @RequestParam(required = false) String requestMetadata) {

        if ("Success".equalsIgnoreCase(status)) {
            log.info("✅ Airtime SUCCESS — txId:{} phone:{} amount:{} {}",
                    transactionId, phoneNumber, amount, currencyCode);
        } else {
            log.warn("❌ Airtime FAILED — txId:{} phone:{} status:{} error:{}",
                    transactionId, phoneNumber, status, errorMessage);
        }

        return ResponseEntity.ok().build();
    }
}
