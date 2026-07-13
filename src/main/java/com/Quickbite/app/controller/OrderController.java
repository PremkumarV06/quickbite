package com.Quickbite.app.controller;

import com.Quickbite.app.model.*;
import com.Quickbite.app.repository.*;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private MenuItemRepository menuItemRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DeliveryTrackingRepository deliveryTrackingRepository;

    @PostMapping
    public ResponseEntity<?> placeOrder(@RequestBody OrderRequest request, HttpSession session) {
        User customer = (User) session.getAttribute("user");
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Must be logged in to place an order!");
        }

        Optional<Restaurant> restaurantOpt = restaurantRepository.findById(request.getRestaurantId());
        if (restaurantOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid restaurant selected.");
        }

        Restaurant restaurant = restaurantOpt.get();
        Order order = new Order();
        order.setCustomer(customer);
        order.setRestaurant(restaurant);
        order.setDeliveryAddress(request.getDeliveryAddress());
        order.setPhone(request.getPhone());
        order.setStatus("PENDING");
        order.setCreatedAt(LocalDateTime.now());

        double totalAmount = 0;
        List<OrderItem> orderItems = new ArrayList<>();

        for (OrderItemRequest itemReq : request.getItems()) {
            Optional<MenuItem> itemOpt = menuItemRepository.findById(itemReq.getMenuItemId());
            if (itemOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid menu item ID: " + itemReq.getMenuItemId());
            }
            MenuItem menuItem = itemOpt.get();
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setMenuItem(menuItem);
            orderItem.setQuantity(itemReq.getQuantity());
            orderItem.setPrice(menuItem.getPrice()); // Lock the price
            totalAmount += menuItem.getPrice() * itemReq.getQuantity();
            orderItems.add(orderItem);
        }

        order.setTotalAmount(totalAmount);
        order.setItems(orderItems);

        // Save order and cascade save order items
        Order savedOrder = orderRepository.save(order);

        // Create Delivery Tracking
        DeliveryTracking tracking = new DeliveryTracking();
        tracking.setOrder(savedOrder);
        
        tracking.setStatus("ASSIGNED");
        tracking.setDriverName("Bob Rider"); // Default driver
        tracking.setDriverPhone("555-123-4567");
        tracking.setEstimatedMinutes(30);
        tracking.setUpdatedAt(LocalDateTime.now());
        deliveryTrackingRepository.save(tracking);

        return ResponseEntity.ok(savedOrder);
    }

    @GetMapping("/customer")
    public ResponseEntity<?> getCustomerOrders(HttpSession session) {
        User customer = (User) session.getAttribute("user");
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Not logged in");
        }
        List<Order> orders = orderRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId());
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/restaurant/{restaurantId}")
    public ResponseEntity<?> getRestaurantOrders(@PathVariable Long restaurantId, HttpSession session) {
        User owner = (User) session.getAttribute("user");
        if (owner == null || (!"OWNER".equals(owner.getRole()) && !"ADMIN".equals(owner.getRole()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
        }
        List<Order> orders = orderRepository.findByRestaurantIdOrderByCreatedAtDesc(restaurantId);
        return ResponseEntity.ok(orders);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateOrderStatus(@PathVariable Long id, @RequestBody StatusUpdateRequest request, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Not logged in");
        }

        Optional<Order> orderOpt = orderRepository.findById(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Order not found");
        }

        Order order = orderOpt.get();
        order.setStatus(request.getStatus());
        Order savedOrder = orderRepository.save(order);

        // Update corresponding delivery tracking status if tracking exists
        Optional<DeliveryTracking> trackingOpt = deliveryTrackingRepository.findByOrderId(order.getId());
        if (trackingOpt.isPresent()) {
            DeliveryTracking tracking = trackingOpt.get();
            if ("PREPARING".equals(request.getStatus())) {
                tracking.setStatus("PREPARING");
                tracking.setEstimatedMinutes(25);
            } else if ("OUT_FOR_DELIVERY".equals(request.getStatus())) {
                tracking.setStatus("PICKED_UP");
                tracking.setEstimatedMinutes(15);
            } else if ("DELIVERED".equals(request.getStatus())) {
                tracking.setStatus("DELIVERED");
                tracking.setEstimatedMinutes(0);
            } else if ("CANCELLED".equals(request.getStatus())) {
                tracking.setStatus("DELIVERED"); // track end
            }
            deliveryTrackingRepository.save(tracking);
        }

        return ResponseEntity.ok(savedOrder);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOrderById(@PathVariable Long id) {
        Optional<Order> orderOpt = orderRepository.findById(id);
        if (orderOpt.isPresent()) {
            return ResponseEntity.ok(orderOpt.get());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Order not found");
    }

    // Request structures
    public static class OrderRequest {
        private Long restaurantId;
        private String deliveryAddress;
        private String phone;
        private List<OrderItemRequest> items;

        public Long getRestaurantId() { return restaurantId; }
        public void setRestaurantId(Long restaurantId) { this.restaurantId = restaurantId; }
        public String getDeliveryAddress() { return deliveryAddress; }
        public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        public List<OrderItemRequest> getItems() { return items; }
        public void setItems(List<OrderItemRequest> items) { this.items = items; }
    }

    public static class OrderItemRequest {
        private Long menuItemId;
        private Integer quantity;

        public Long getMenuItemId() { return menuItemId; }
        public void setMenuItemId(Long menuItemId) { this.menuItemId = menuItemId; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }

    public static class StatusUpdateRequest {
        private String status;

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}
