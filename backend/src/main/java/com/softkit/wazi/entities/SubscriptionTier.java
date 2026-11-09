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
public class SubscriptionTier {
    @Id
    private String id;
    private String name;
    private String description;
    @NotNull(message = "Amount is required")
    private Integer amount;
    private LocalDateTime logDate;
    private Integer status;
    private String billingType;
    private String courseId;
    private Integer rankCode;

    @PrePersist
    public void prePersist() {
        this.id = UuidGenerator.generateEntityUuid("subscription-tier");
        this.logDate = LocalDateTime.now();
        this.status=1;
    }

}
