package com.Quickbite.app.controller;

import com.Quickbite.app.model.DeliveryTracking;
import com.Quickbite.app.model.Order;
import com.Quickbite.app.model.User;
import com.Quickbite.app.repository.DeliveryTrackingRepository;
import com.Quickbite.app.repository.OrderRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/delivery")
public class DeliveryController {

    @Autowired
    private DeliveryTrackingRepository deliveryTrackingRepository;

    @Autowired
    private OrderRepository orderRepository;

    @GetMapping("/track/{orderId}")
    public ResponseEntity<?> getTrackingByOrderId(@PathVariable Long orderId) {
        Optional<DeliveryTracking> trackingOpt = deliveryTrackingRepository.findByOrderId(orderId);
        if (trackingOpt.isPresent()) {
            return ResponseEntity.ok(trackingOpt.get());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Tracking details not found.");
    }

    @GetMapping("/driver/orders")
    public ResponseEntity<?> getDriverOrders(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null || !"DRIVER".equals(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only drivers can view driver deliveries.");
        }
        return ResponseEntity.ok(deliveryTrackingRepository.findAll());
    }

    @PutMapping("/track/{id}")
    public ResponseEntity<?> updateTracking(@PathVariable Long id, @RequestBody DeliveryTrackingUpdateRequest request, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Must be logged in.");
        }
        Optional<DeliveryTracking> trackingOpt = deliveryTrackingRepository.findById(id);
        if (trackingOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Tracking task not found.");
        }

        DeliveryTracking tracking = trackingOpt.get();
        if (request.getStatus() != null) {
            tracking.setStatus(request.getStatus());
            Order order = tracking.getOrder();
            if (order != null) {
                if ("ASSIGNED".equals(request.getStatus())) {
                    order.setStatus("PENDING");
                } else if ("PREPARING".equals(request.getStatus())) {
                    order.setStatus("PREPARING");
                } else if ("PICKED_UP".equals(request.getStatus())) {
                    order.setStatus("OUT_FOR_DELIVERY");
                } else if ("DELIVERED".equals(request.getStatus())) {
                    order.setStatus("DELIVERED");
                }
                orderRepository.save(order);
            }
        }
        if (request.getEstimatedMinutes() != null) {
            tracking.setEstimatedMinutes(request.getEstimatedMinutes());
        }
        if (request.getDriverName() != null) {
            tracking.setDriverName(request.getDriverName());
        }
        if (request.getDriverPhone() != null) {
            tracking.setDriverPhone(request.getDriverPhone());
        }
        tracking.setUpdatedAt(LocalDateTime.now());
        DeliveryTracking savedTracking = deliveryTrackingRepository.save(tracking);
        return ResponseEntity.ok(savedTracking);
    }

    public static class DeliveryTrackingUpdateRequest {
        private String status;
        private Integer estimatedMinutes;
        private String driverName;
        private String driverPhone;

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public Integer getEstimatedMinutes() { return estimatedMinutes; }
        public void setEstimatedMinutes(Integer estimatedMinutes) { this.estimatedMinutes = estimatedMinutes; }
        public String getDriverName() { return driverName; }
        public void setDriverName(String driverName) { this.driverName = driverName; }
        public String getDriverPhone() { return driverPhone; }
        public void setDriverPhone(String driverPhone) { this.driverPhone = driverPhone; }
    }
}
