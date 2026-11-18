package com.lunchpicker.auth.dto;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter @AllArgsConstructor
public class AuthResponse {
    private String token;
    private Instant expiresAt;
    private Long userId;
    private String displayName;
}
