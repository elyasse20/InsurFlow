package com.insurflow.assurance.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Maps to the 'users' collection.
 * Equivalent of userModel.js (Mongoose schema).
 */
@Document(collection = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    private String username;

    @Indexed(unique = true)
    private String email;

    private String password;

    @Builder.Default
    private UserRole role = UserRole.ADMIN;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public UserRole getRole() {
        return role != null ? role : UserRole.ADMIN;
    }

    public String getRoleName() {
        if (role == null) return "ADMIN";
        return role.name().toUpperCase();
    }

    public enum UserRole {
        USER, ADMIN, user, admin
    }
}
