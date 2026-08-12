package com.insurflow.assurance.controller;

import com.insurflow.assurance.dto.RegisterRequest;
import com.insurflow.assurance.model.User;
import com.insurflow.assurance.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin-only user management.
 * All routes require ROLE_ADMIN (enforced in SecurityConfig and @PreAuthorize).
 * Equivalent of userRoutes.js (GET, PUT, DELETE — after protect + adminOnly middleware).
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    /** GET /api/users — equivalent of getUsers */
    @GetMapping
    public List<User> getAll() {
        return userService.getAll();
    }

    /** POST /api/users — create a new user (admin only) */
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody RegisterRequest req) {
        User created = userService.register(req);
        return ResponseEntity.status(201)
                .body(Map.of("message", "User created successfully", "id", created.getId()));
    }

    /** PUT /api/users/:id — equivalent of updateUser */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable String id,
                                                       @RequestBody RegisterRequest req) {
        User updated = userService.update(id, req);
        return ResponseEntity.ok(Map.of("message", "Updated successfully", "id", updated.getId()));
    }

    /** DELETE /api/users/:id — equivalent of deleteUser */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable String id) {
        userService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Deleted successfully"));
    }
}
