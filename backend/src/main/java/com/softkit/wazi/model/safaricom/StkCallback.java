package com.softkit.wazi.model.safaricom;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class StkCallback {
    @JsonProperty("MerchantRequestID")
    private String MerchantRequestID;
    @JsonProperty("CheckoutRequestID")
    private String CheckoutRequestID;
    @JsonProperty("ResultCode")
    private Integer ResultCode;
    @JsonProperty("ResultDesc")
    private String ResultDesc;
    @JsonProperty("CallbackMetadata")
    private CallbackMetaData CallbackMetadata;
}
