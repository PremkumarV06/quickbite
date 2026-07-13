package com.Quickbite.app.controller;

import com.Quickbite.app.model.User;
import com.Quickbite.app.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user, HttpSession session) {
        if (user.getEmail() == null || user.getPassword() == null || user.getName() == null || user.getRole() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing required registration details.");
        }
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Email is already taken!");
        }
        User savedUser = userRepository.save(user);
        session.setAttribute("user", savedUser);
        return ResponseEntity.ok(savedUser);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpSession session) {
        if (request.getEmail() == null || request.getPassword() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Email and password are required.");
        }
        Optional<User> userOpt = userRepository.findByEmailAndPassword(request.getEmail(), request.getPassword());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid email or password!");
        }
        User user = userOpt.get();
        session.setAttribute("user", user);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok("Successfully logged out!");
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Not logged in");
        }
        return ResponseEntity.ok(user);
    }

    public static class LoginRequest {
        private String email;
        private String password;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }
}
