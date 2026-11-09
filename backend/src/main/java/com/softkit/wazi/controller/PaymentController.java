package com.softkit.wazi.controller;

import com.softkit.wazi.model.safaricom.PaymentPayload;
import com.softkit.wazi.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/payment/safaricom")
public class PaymentController {
    private final PaymentService paymentService;

    @PostMapping("/trigger")
    public HttpEntity<Object> triggerPayment(
            @Valid @RequestBody PaymentPayload payload
    ) {
        return paymentService.triggerPayment(payload);
    }

    @GetMapping("/query")
    public HttpEntity<Object> queryPayment(
            @RequestParam(name = "checkoutRequestID") String checkoutRequestID
    ) {
        return paymentService.queryPayment(checkoutRequestID);
    }
}
