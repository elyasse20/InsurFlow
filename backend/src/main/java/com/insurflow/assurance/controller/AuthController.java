package com.insurflow.assurance.controller;

import com.insurflow.assurance.dto.AuthResponse;
import com.insurflow.assurance.dto.LoginRequest;
import com.insurflow.assurance.dto.RegisterRequest;
import com.insurflow.assurance.model.User;
import com.insurflow.assurance.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Authentication endpoints — equivalent of the public userRoutes in server.js
 * (POST /api/users/login and POST /api/users/register before the protect middleware).
 *
 * Mounted at /api/auth to match RESTful conventions.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    /** POST /api/auth/login — equivalent of loginUser */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(userService.login(request));
    }

    /** POST /api/auth/register — open for initial setup; admin-gated in SecurityConfig for /api/users */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        User user = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "User created successfully", "id", user.getId()));
    }
}
