package com.softkit.wazi.entities;

import com.softkit.wazi.util.UuidGenerator;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@Entity
@Table(
        name = "billing"
)
public class Billing {
    @Id
    private String id;
    @Column(updatable = false)
    private String merchantRequestId;
    @Column(updatable = false)
    private String checkoutRequestId;
    @NotNull(message = "Amount is required")
    private BigDecimal amount;
    @Column(updatable = false)
    private LocalDate transactionDate;
    private String phoneNumber;
    private String institutionCode;
    private String receiptNumber;
    private String paymentStatus;
    private String paymentMethod;
    private String billingDescription;
    private String userId;
    private String learnerId;
    @Builder.Default
    private Integer callbackResultCode=-1;
    private String callbackResultDesc;
    @Column(nullable = false)
    private String billingType;
    private String addedBy;
    private LocalDateTime logDate;

    @PrePersist
    public void prePersist() {
        this.id = UuidGenerator.generateEntityUuid("billing");
        this.logDate = LocalDateTime.now();
        if(Objects.isNull(this.transactionDate)){
            this.transactionDate = LocalDate.now();
        }
        if(Objects.nonNull(billingDescription)) {
            this.billingDescription = this.billingDescription.toUpperCase();
        }

    }

}
