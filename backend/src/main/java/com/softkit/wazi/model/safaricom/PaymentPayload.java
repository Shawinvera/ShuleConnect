package com.softkit.wazi.model.safaricom;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PaymentPayload {

    @NotNull(message = "PhoneNumber is required")
    @NotBlank(message = "PhoneNumber is required")
    @Size(min = 10, max = 12, message = "PhoneNumber must be between 10 and 12 characters")
    private String phoneNumber;

    @NotNull(message = "userId is required")
    private String userId;

    @NotNull(message = "learnerId is required")
    private String learnerId;
    private String subscriptionId;
}
