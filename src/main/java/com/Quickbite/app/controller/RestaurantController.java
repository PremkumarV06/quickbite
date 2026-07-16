package com.Quickbite.app.controller;

import com.Quickbite.app.model.MenuItem;
import com.Quickbite.app.model.Restaurant;
import com.Quickbite.app.model.User;
import com.Quickbite.app.repository.MenuItemRepository;
import com.Quickbite.app.repository.RestaurantRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private MenuItemRepository menuItemRepository;

    @GetMapping
    public List<Restaurant> getAllRestaurants() {
        return restaurantRepository.findAll();
    }

    @GetMapping("/menu-items")
    public List<MenuItem> getAllMenuItems() {
        return menuItemRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRestaurantById(@PathVariable Long id) {
        Optional<Restaurant> restaurant = restaurantRepository.findById(id);
        if (restaurant.isPresent()) {
            return ResponseEntity.ok(restaurant.get());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Restaurant not found!");
    }

    @GetMapping("/{id}/menu")
    public List<MenuItem> getRestaurantMenu(@PathVariable Long id) {
        return menuItemRepository.findByRestaurantId(id);
    }

    @PostMapping
    public ResponseEntity<?> createRestaurant(@RequestBody Restaurant restaurant, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null || (!"OWNER".equals(user.getRole()) && !"ADMIN".equals(user.getRole()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only restaurant owners or admins can add restaurants!");
        }
        Restaurant savedRestaurant = restaurantRepository.save(restaurant);
        return ResponseEntity.ok(savedRestaurant);
    }

    @PostMapping("/{id}/menu")
    public ResponseEntity<?> addMenuItem(@PathVariable Long id, @RequestBody MenuItem menuItem, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null || (!"OWNER".equals(user.getRole()) && !"ADMIN".equals(user.getRole()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only restaurant owners or admins can add menu items!");
        }
        Optional<Restaurant> restaurantOpt = restaurantRepository.findById(id);
        if (restaurantOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Restaurant not found!");
        }
        menuItem.setRestaurant(restaurantOpt.get());
        MenuItem savedItem = menuItemRepository.save(menuItem);
        return ResponseEntity.ok(savedItem);
    }
}
