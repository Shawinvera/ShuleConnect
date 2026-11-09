package com.softkit.wazi.service;

import com.softkit.wazi.entities.SubscriptionTier;
import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.model.safaricom.PaymentPayload;
import com.softkit.wazi.model.safaricom.StkCallbackWrapper;
import com.softkit.wazi.repository.SubscriptionTierRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SubscriptionTierService {
    private final SubscriptionTierRepo subscriptionTierRepo;

    public List<SubscriptionTier> fetchSubscriptionTierByStatus(String courseId, Integer status) {
        if (status !=null && status==1 ) {
            return subscriptionTierRepo
                    .findByCourseIdAndStatus(courseId, status)
                    .stream()
                    .peek(t->t.setRankCode(getRankCodeByBillingType(t.getBillingType())))
                    .toList();
        }
        return subscriptionTierRepo
                .findByCourseId(courseId)
                .stream()
                .peek(t->t.setRankCode(getRankCodeByBillingType(t.getBillingType())))
                .toList();
    }

     public SubscriptionTier fetchSubscriptionTierById(String id) {
        return subscriptionTierRepo.findById(id).orElse(null);
     }

     public CustomResponse saveSubscriptionTier(SubscriptionTier subscriptionTier) {
        String name = subscriptionTier.getName();
        String courseId = subscriptionTier.getCourseId();
        Integer amount = subscriptionTier.getAmount();
        if (name == null || name.isEmpty() || courseId == null || courseId.isEmpty() || amount == null || amount <= 0) {
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage("Invalid subscription tier data. Name, courseId, and amount are required and must be valid.")
                    .build();
        }
        int rankCode = getRankCodeByBillingType(subscriptionTier.getBillingType());
        subscriptionTier.setRankCode(rankCode);
        subscriptionTier =  subscriptionTierRepo.save(subscriptionTier);
        return CustomResponse.builder()
                .successful(true)
                .data(subscriptionTier)
                .build();
     }


     private Integer getRankCodeByBillingType(String billingType) {
        int rankCode = 1000;
        if (billingType.equalsIgnoreCase("MINUTELY")) {
            rankCode =1;
        }else if(billingType.equalsIgnoreCase("HOURLY")){
            rankCode =2;
        }else if(billingType.equalsIgnoreCase("DAILY")){
            rankCode =3;
        }else if(billingType.equalsIgnoreCase("WEEKLY")){
            rankCode =4;
        }else if(billingType.equalsIgnoreCase("MONTHLY")){
            rankCode =5;
        }else if(billingType.equalsIgnoreCase("YEARLY")) {
            rankCode = 6;
        }
        return rankCode;
     }


}
