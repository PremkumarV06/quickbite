package com.Quickbite.app.repository;

import com.Quickbite.app.model.DeliveryTracking;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DeliveryTrackingRepository extends JpaRepository<DeliveryTracking, Long> {
    Optional<DeliveryTracking> findByOrderId(Long orderId);
}
