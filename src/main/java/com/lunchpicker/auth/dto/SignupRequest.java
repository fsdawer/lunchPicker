package com.lunchpicker.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter @NoArgsConstructor
public class SignupRequest {
    @NotBlank @Pattern(regexp = "^[a-zA-Z0-9_]{4,30}$") private String loginId;
    @NotBlank @Size(min = 8, max = 72) private String password;
    @NotBlank @Size(max = 40) private String displayName;
}
