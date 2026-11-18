package com.softkit.wazi.model;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AirtimeRecipient {
    private String phoneNumber;
    private String currencyCode;
    private String amount;
}
