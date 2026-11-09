package com.softkit.wazi.service;

import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.model.safaricom.PaymentPayload;
import com.softkit.wazi.model.safaricom.StkCallbackWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PaymentService  {
    private final SafaricomService safaricomService;

    public ResponseEntity<Object> triggerPayment(PaymentPayload payload) {
        var token= safaricomService.getToken();
        if (!token.getSuccessful())
            return  ResponseEntity.badRequest().body(token);

        CustomResponse response= safaricomService.processRequest((String) token.getData(), payload);
        if (!response.getSuccessful())
            return ResponseEntity.badRequest().body(response);
        return ResponseEntity.ok().body(response);
    }

    public ResponseEntity<Object> paymentSafaricomCallback(StkCallbackWrapper callBack) {
        CustomResponse response= safaricomService.paymentCallback(callBack);
        if (!response.getSuccessful())
            return ResponseEntity.badRequest().body(response);
        return ResponseEntity.ok().body(response);
    }

    public HttpEntity<Object> queryPayment(String checkoutRequestID) {
        CustomResponse response= safaricomService.queryRequest(checkoutRequestID);
        if (!response.getSuccessful())
            return ResponseEntity.badRequest().body(response);
        return ResponseEntity.ok().body(response);
    }


}
