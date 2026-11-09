package com.softkit.wazi.model.safaricom;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Data
public class PaymentTrigger {


    @JsonProperty("BusinessShortCode")
    private String businessShortCode;
    @JsonProperty("Password")
    private String password;
    @JsonProperty("Timestamp")
    private String timestamp;
    @JsonProperty("TransactionType")
    private String transactionType;
    @JsonProperty("Amount")
    private Integer amount;
    @JsonProperty("PartyA")
    private String partyA;
    @JsonProperty("PartyB")
    private String partyB;
    @JsonProperty("PhoneNumber")
    private String phoneNumber;
    @JsonProperty("CallBackURL")
    private String callBackURL;
    @JsonProperty("AccountReference")
    private String accountReference;
    @JsonProperty("TransactionDesc")
    private String transactionDesc;

}
