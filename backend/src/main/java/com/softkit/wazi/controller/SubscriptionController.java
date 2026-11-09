package com.softkit.wazi.controller;

import com.softkit.wazi.entities.SubscriptionTier;
import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.model.safaricom.PaymentPayload;
import com.softkit.wazi.service.PaymentService;
import com.softkit.wazi.service.SubscriptionTierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/subscription")
public class SubscriptionController {
    private final SubscriptionTierService subscriptionTierService;

    @PostMapping("/tier")
    public ResponseEntity<Object> createTier(
            @Valid @RequestBody SubscriptionTier subscriptionTier
            ) {
        CustomResponse customResponse = subscriptionTierService.saveSubscriptionTier(subscriptionTier);
        return ResponseEntity.status(HttpStatus.CREATED).body(customResponse);
    }
}
