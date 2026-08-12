package com.insurflow.assurance.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** POST /api/auth/login — equivalent of loginUser request body */
@Data
public class LoginRequest {
    @Email @NotBlank
    private String email;
    @NotBlank
    private String password;
}
