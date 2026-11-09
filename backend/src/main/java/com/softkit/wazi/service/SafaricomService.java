package com.softkit.wazi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.softkit.wazi.entities.Billing;
import com.softkit.wazi.entities.SubscriptionTier;
import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.model.safaricom.*;
import com.softkit.wazi.repository.PaymentsRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SafaricomService {
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final LearnerService learnerService;
    private final PaymentsRepo paymentRepo;
    private final SubscriptionTierService subscriptionTierService;

    @Value("${safaricom.token-url}")
    private String safaricomTokenUrl;

    @Value("${safaricom.username}")
    private String safaricomUsername;

    @Value("${safaricom.password}")
    private String safaricomPassword;

    @Value("${safaricom.short-code}")
    private String safaricomBusinessShortCode;

    @Value("${safaricom.pass-key}")
    private String safaricomPassKey;

    @Value("${safaricom.callback-url}")
    private String callBackUrl;
    @Value("${safaricom.processing-url}")
    private String requestProcessingUrl;
    @Value("${safaricom.payment-query-url}")
    private String requestQueryUrl;

    public record SafaricomTokenResp(String access_token, String expires_in) {}

    public CustomResponse getToken(){

        //make a post request submitting form-data with api-key header to SMS Provider(Africastalking)
        //Create HTTP Headers
        HttpHeaders headers = new HttpHeaders();
        //create Basic Auth Token
        headers.setBasicAuth(safaricomUsername, safaricomPassword);

        HttpEntity<String> entity =  new HttpEntity<>(headers);

        //make get request to the token url
        try {
            ResponseEntity<SafaricomTokenResp> response= restTemplate.exchange(
                    safaricomTokenUrl,
                    HttpMethod.GET,
                    entity,
                    SafaricomTokenResp.class
            );
            return CustomResponse.builder()
                    .successful(true)
                    .data(
                            Objects.requireNonNull(
                                    Objects.requireNonNull(response.getBody())
                                            .access_token))
                    .build();
        } catch (Exception e) {
            log.error(e.getMessage());
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage("Failed to get token")
                    .build();
        }

    }

    public PaymentTrigger getPaymentTrigger(PaymentPayload payload, SubscriptionTier subscriptionTier){
        String timestamp= getTimeStamp();

        return PaymentTrigger.builder()
                .businessShortCode(safaricomBusinessShortCode)
                .password(getPassword(timestamp))
                .timestamp(timestamp)
                .transactionType("CustomerPayBillOnline")
                .amount(subscriptionTier.getAmount())
                .partyA(payload.getPhoneNumber())
                .partyB(safaricomBusinessShortCode)
                .phoneNumber(payload.getPhoneNumber())
                .callBackURL(callBackUrl)
                .accountReference("Wazi")
                .transactionDesc(subscriptionTier.getBillingType())
                .build();
    }

    public Object getQueryObject(String checkoutRequestId){
        String timestamp= getTimeStamp();
        Map<String, String> payload = new HashMap<>();
        payload.put("BusinessShortCode", safaricomBusinessShortCode);
        payload.put("Password", getPassword(timestamp)); // Generate the password
        payload.put("Timestamp", timestamp); // Current timestamp
        payload.put("CheckoutRequestID", checkoutRequestId);

        return payload;
    }

    //generate string of the format YYYYMMDDHHmmss from current timestamp
    public String getTimeStamp(){
        //if ss is having one digit, add a 0 before it
        return LocalDateTime
                .now()
                .toString().replace("T", "")
                .replace(":", "")
                .replace("-", "")
                .substring(0, 14);
    }

    //generate function which will be used to generate password
    //base64.encode(Shortcode+Passkey+Timestamp)
    public String getPassword(String timestamp){
        return java.util.Base64.getEncoder()
                .encodeToString((safaricomBusinessShortCode + safaricomPassKey + timestamp).getBytes()
        );
    }


    public CustomResponse processRequest(String token, PaymentPayload payload){
        SubscriptionTier subscriptionTier = subscriptionTierService.fetchSubscriptionTierById(payload.getSubscriptionId());
        //if subscription tier is null, return error response
        if (subscriptionTier == null){
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage("Invalid subscription tier")
                    .build();
        }
        //Create HTTP Headers
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        payload.setPhoneNumber(formatPhoneNumber(payload.getPhoneNumber()));

        PaymentTrigger paymentTrigger= getPaymentTrigger(payload, subscriptionTier);
        try {

            String body = objectMapper.writeValueAsString(paymentTrigger);
//            log.info(body);

            HttpEntity<String> entity =  new HttpEntity<>(body, headers);
            //print out the requestBody as a JSON Object

            ResponseEntity<PaymentResponse> response = restTemplate.exchange(
                    requestProcessingUrl,
                    HttpMethod.POST,
                    entity,
                    PaymentResponse.class);

            //if payment is successful, save the payment details to the database
            if (response.getStatusCode().is2xxSuccessful()){
                //create payment entity
                Billing payment= Billing.builder()
                        .merchantRequestId(Objects.requireNonNull(response.getBody()).getMerchantRequestId())
                        .checkoutRequestId(response.getBody().getCheckoutRequestId())
                        .amount(BigDecimal.valueOf(paymentTrigger.getAmount()))
                        .phoneNumber(paymentTrigger.getPhoneNumber())
                        .institutionCode("SAFARICOM")
                        .receiptNumber("")
                        .paymentStatus("PENDING")
                        .paymentMethod("MOBILE-MONEY")
                        .billingDescription(subscriptionTier.getDescription())
                        .billingType(subscriptionTier.getBillingType())
                        .learnerId(payload.getLearnerId())
                        .userId(payload.getUserId())
                        .build();

                paymentRepo.saveAndFlush(payment);
            }



            return CustomResponse.builder()
                    .successful(true)
                    .data(Objects.requireNonNull(response.getBody()).getCheckoutRequestId())
                    .build();
        }catch (Exception ex){
            return CustomResponse.builder()
                    .successful(false)
                    .data(ex.getMessage())
                    .build();
        }

    }

    //generate phone number with phone number prefix if length is less than 12
    public String formatPhoneNumber(String phoneNumber){
        if (phoneNumber.length() < 12 && phoneNumber.startsWith("0")){
            return "254" + phoneNumber.substring(1);
        }
        return phoneNumber;
    }

    public CustomResponse paymentCallback(StkCallbackWrapper callBack){
        //get the payment entity from the database
        String checkoutRequestID = callBack.getBody().getStkCallback().getCheckoutRequestID();
        log.info("Checking for payment by checkoutID {}", checkoutRequestID);
        Optional<Billing> _payment= paymentRepo.findByCheckoutRequestId(checkoutRequestID);
        if (_payment.isEmpty()){
            log.error("Payment not found for checkoutID {}", checkoutRequestID);
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage("Payment not found")
                    .data("Payment not found")
                    .build();
        }

        Billing payment= _payment.get();
        //check if checkoutRequestId and merchantRequestId are the same
        String merchantRequestID = callBack.getBody().getStkCallback().getMerchantRequestID();
        if (!payment.getMerchantRequestId().equalsIgnoreCase(merchantRequestID)){
            log.error("Payment for checkoutID {} does not match merchantRequestId {}", checkoutRequestID, merchantRequestID);
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage("Payment not found")
                    .data("Payment not found")
                    .build();
        }
        StkCallback stkCallback= callBack.getBody().getStkCallback();

        //update the payment entity with the callback details
        Integer paymentResultCode = stkCallback.getResultCode();
        payment.setCallbackResultCode(paymentResultCode);
        payment.setCallbackResultDesc(stkCallback.getResultDesc());
        log.info("Received payment callback for checkoutId {} with result code {} and description {}", checkoutRequestID, paymentResultCode, stkCallback.getResultDesc());

        //if the payment was successful, update the payment status to completed
        if (paymentResultCode == 0
                && !payment.getPaymentStatus().equalsIgnoreCase("COMPLETED")
        ) {
            payment.setPaymentStatus("COMPLETED");
            //set the receipt number
            //get receipt number from the stkCallBack Items Name
            for (CallbackMetaDataItem item : stkCallback.getCallbackMetadata().getItem()){
                if (item.getName().equalsIgnoreCase("MpesaReceiptNumber") || item.getName().contains("MpesaReceiptNumber")){
                    payment.setReceiptNumber((String) item.getValue());
                    break;
                }
            }
            log.info("Updating Learners subscription {}", checkoutRequestID);
            updateLearnerSubscription(payment);

        }else {
            String paymentStatus = getPaymentStatusByResultCode(paymentResultCode);
            payment.setPaymentStatus(paymentStatus);
        }
        paymentRepo.save(payment);

        return CustomResponse.builder()
                .successful(true)
                .data("Payment processed successfully")
                .build();

    }

    private static @NonNull String getPaymentStatusByResultCode(Integer paymentResultCode) {
        String paymentStatus= "PENDING";

        if (paymentResultCode ==1001) {
            paymentStatus = "PENDING";
        }else if (paymentResultCode == 1){
            paymentStatus= "INSUFFICIENT-FUNDS";
        }else if (paymentResultCode == 1032){
            paymentStatus= "CANCELLED";
        }else if (paymentResultCode == 1037){
            paymentStatus= "TIMEOUT";
        }else if(paymentResultCode ==2001){
            paymentStatus= "INCORRECT-PIN";
        }else if (paymentResultCode ==2002){
            paymentStatus= "UNABLE_TO_COMPLETE";
        }
        return paymentStatus;
    }

    public void updateLearnerSubscription(Billing payment) {
        log.info("Updating learner subscription expiration date");
        //compute number of months paid for and add to the subscription expiry date
        Instant now = Instant.now();
        String subscriptionType = payment.getBillingType();

        Instant subExp= Instant.now();
        if (subscriptionType.equalsIgnoreCase("HOURLY")){
            subExp= now.plus(6, ChronoUnit.HOURS);
        }if (subscriptionType.equalsIgnoreCase("DAILY")){
            subExp= now.plus(1, ChronoUnit.DAYS);
        }if (subscriptionType.equalsIgnoreCase("WEEKLY")){
            subExp= now.plus(7, ChronoUnit.DAYS);
        }else if (subscriptionType.equalsIgnoreCase("MONTHLY")){
            subExp= now.plus(30, ChronoUnit.DAYS);
        }
        learnerService.updateLearnerSubscription(payment.getLearnerId(), subExp);
    }


    public CustomResponse queryRequest(String checkoutRequestId){
        Optional<Billing> _payment = paymentRepo.findByCheckoutRequestId(checkoutRequestId);
        if (_payment.isEmpty()){
            return CustomResponse.builder()
                    .successful(false)
                    .data("Transaction not found")
                    .build();
        }

        Billing payment = _payment.get();
        boolean isPaymentCompleted = payment.getPaymentStatus().equalsIgnoreCase("COMPLETED");
        if (isPaymentCompleted){
            return CustomResponse.builder()
                    .successful(true)
                    .data("COMPLETED")
                    .build();
        }
        LocalDateTime logDate = payment.getLogDate();
        boolean isPending = payment.getPaymentStatus().equalsIgnoreCase("PENDING");
        if (!isPending){
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage(payment.getCallbackResultDesc())
                    .data(payment.getPaymentStatus())
                    .build();
        }

        //logDate is less than 40 seconds ago
        if (logDate.isAfter(LocalDateTime.now().minusSeconds(40))){
            return CustomResponse.builder()
                    .successful(true)
                    .data("PROCESSING")
                    .errorMessage("PROCESSING - Please wait while we confirm your payment")
                    .build();
        }

        var tokenResp= getToken();
        if (!tokenResp.getSuccessful())
            return  tokenResp;

        //Create HTTP Headers
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth((String) tokenResp.getData());
        headers.setContentType(MediaType.APPLICATION_JSON);


        Object body= getQueryObject(checkoutRequestId);
        try {

            log.info("Query checkoutId - {}, Response - {}", checkoutRequestId, body.toString());

            HttpEntity<Object> entity =  new HttpEntity<>(body, headers);
            //print out the requestBody as a JSON Object
            ResponseEntity<PaymentStatus> response = restTemplate.exchange(
                    requestQueryUrl,
                    HttpMethod.POST,
                    entity,
                    PaymentStatus.class);

            String statusResponse= "PENDING";
            String rspMessage="";

            //if payment is successful, save the payment details to the database
            if (response.getStatusCode().is2xxSuccessful()){
                String resultCode = Objects.requireNonNull(response.getBody()).getResultCode();
                int status = Integer.parseInt(resultCode);
//                int status = 0;
                statusResponse = status==0?"COMPLETED":"FAILED";
                if (status==4999){
                    statusResponse = "PROCESSING";
                }
                rspMessage = response.getBody().getResultDesc();

                //fetch payment using checkoutRequestId
                payment.setPaymentStatus(statusResponse);
                payment.setCallbackResultCode(status);
                payment.setCallbackResultDesc(rspMessage);
                paymentRepo.save(payment);

                /*
                Only update details if payment had not been completed
                update client with the payment details,
                this should change subscription date and sms balance
                 */
                if (status==0  ){
                    updateLearnerSubscription(payment);
                }

            }else{
                return CustomResponse.builder()
                        .successful(false)
                        .data("Failed to query payment status")
                        .build();
            }



            return CustomResponse.builder()
                    .successful(true)
                    .data(statusResponse)
                    .errorMessage(rspMessage)
                    .build();
        }catch (Exception ex){
            return CustomResponse.builder()
                    .successful(false)
                    .data(ex.getMessage())
                    .build();
        }

    }

}

