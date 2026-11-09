package com.softkit.wazi.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CustomResponse {
    @Builder.Default
    private Boolean successful=true;
    private String errorMessage;
    private Object data;
}
