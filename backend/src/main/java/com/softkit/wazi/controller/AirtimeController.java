package com.softkit.wazi.controller;

import com.softkit.wazi.model.AirtimeRewardRequestDto;
import com.softkit.wazi.model.AirtimeRecipient;
import com.softkit.wazi.service.AirtimeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/airtime")
@RequiredArgsConstructor
@Slf4j
public class AirtimeController {

    private final AirtimeService airtimeService;

    /** Reward a learner based on activity type */
    @PostMapping("/reward")
    public ResponseEntity<String> rewardAirtime(@RequestBody AirtimeRewardRequestDto dto) {
        switch (dto.getType()) {
            case ATTENDANCE -> airtimeService.rewardAttendance(dto.getPhoneNumber());
            case QUIZ       -> airtimeService.rewardQuizCompletion(dto.getPhoneNumber(), dto.getScore());
            case COURSE     -> airtimeService.rewardCourseCompletion(dto.getPhoneNumber());
        }
        return ResponseEntity.ok("Airtime reward queued for " + dto.getPhoneNumber());
    }

    /** Send custom airtime amount to a single phone */
    @PostMapping("/send")
    public ResponseEntity<String> sendAirtime(@RequestBody Map<String, String> body) {
        String phone    = body.get("phoneNumber");
        String currency = body.getOrDefault("currencyCode", "KES");
        String amount   = body.getOrDefault("amount", "5");
        airtimeService.rewardAirtime(phone, currency, amount);
        return ResponseEntity.ok("Airtime of " + currency + " " + amount + " queued for " + phone);
    }

    /** Bulk airtime to multiple recipients */
    @PostMapping("/send-bulk")
    public ResponseEntity<String> sendBulk(@RequestBody List<AirtimeRecipient> recipients) {
        airtimeService.rewardBulkAirtime(recipients);
        return ResponseEntity.ok("Bulk airtime queued for " + recipients.size() + " recipient(s)");
    }
}
