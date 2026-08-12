package com.insurflow.assurance.dto;

import com.insurflow.assurance.model.User.UserRole;
import jakarta.validation.constraints.*;
import lombok.Data;

/** POST /api/auth/register & POST /api/users — equivalent of registerUser request body */
@Data
public class RegisterRequest {
    @NotBlank
    private String username;

    @Email @NotBlank
    private String email;

    @NotBlank @Size(min = 6)
    private String password;

    private UserRole role;
}
