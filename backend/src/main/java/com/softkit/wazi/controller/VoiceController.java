package com.softkit.wazi.controller;

import com.softkit.wazi.model.VoiceBroadcastRequestDto;
import com.softkit.wazi.service.ATService;
import com.softkit.wazi.service.StaffNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Slf4j
public class VoiceController {

    private final ATService atService;
    private final StaffNotificationService staffNotificationService;

    /**
     * AfricasTalking Voice callback — AT calls this URL during/after a voice session.
     * Returns XML instructing AT what TTS text to speak.
     * Mapped under /public/** so no auth is required.
     */
    @PostMapping(
            value = "/public/at/voice/callback",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
            produces = MediaType.APPLICATION_XML_VALUE
    )
    public ResponseEntity<String> voiceCallback(
            @RequestParam(required = false) String isActive,
            @RequestParam(required = false) String direction,
            @RequestParam(required = false) String callerNumber,
            @RequestParam(required = false) String destinationNumber,
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false) String callSessionState,
            @RequestParam(required = false) String dtmfDigits) {

        log.info("Voice callback: session={}, state={}, caller={}", sessionId, callSessionState, callerNumber);

        String message = atService.getVoiceMessage(callerNumber);

        String xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Say>" + message + "</Say></Response>";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_XML)
                .body(xml);
    }

    /**
     * Authenticated endpoint: triggers a voice broadcast to a list of recipients.
     */
    @PostMapping("/voice/broadcast")
    public ResponseEntity<String> broadcast(@RequestBody VoiceBroadcastRequestDto dto) {
        atService.makeVoiceBroadcast(dto.getPhoneNumbers(), dto.getMessage());
        staffNotificationService.saveVoiceBroadcastNotifications(dto.getPhoneNumbers(), dto.getMessage());
        int count = dto.getPhoneNumbers() != null ? dto.getPhoneNumbers().size() : 0;
        return ResponseEntity.ok("Broadcast initiated for " + count + " recipients.");
    }
}
