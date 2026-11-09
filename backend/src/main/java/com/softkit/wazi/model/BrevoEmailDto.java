package com.softkit.wazi.model;

import lombok.Builder;

import java.util.List;

public record BrevoEmailDto(
        EmailAddress sender,
        String subject,
        String htmlContent,
        List<MessageVersion> messageVersions
    ){

    public record EmailAddress(
            String email,
            String name
    ) {    }

    @Builder
    public record MessageVersion(
            List<EmailAddress> to,
            String htmlContent,
            String subject
    ) {    }

}

