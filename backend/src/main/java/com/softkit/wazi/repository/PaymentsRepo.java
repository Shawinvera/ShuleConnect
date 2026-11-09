package com.softkit.wazi.repository;

import com.softkit.wazi.entities.Billing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentsRepo extends JpaRepository<Billing, String> {
    Optional<Billing> findByCheckoutRequestId(String checkoutRequestId);
}
