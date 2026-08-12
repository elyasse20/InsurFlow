package com.insurflow.assurance.dto;

import lombok.*;

/** Auth response DTO — mirrors the JSON returned by loginUser in userController.js */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String token;
    private String id;
    private String username;
    private String role;
    private String email;
}
