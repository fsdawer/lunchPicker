package com.lunchpicker.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter @NoArgsConstructor
public class LoginRequest {
    @NotBlank @Pattern(regexp = "^[a-zA-Z0-9_]{4,30}$") private String loginId;
    @NotBlank private String password;
}
