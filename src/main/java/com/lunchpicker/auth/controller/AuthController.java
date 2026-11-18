package com.lunchpicker.auth.controller;

import com.lunchpicker.auth.dto.AuthResponse;
import com.lunchpicker.auth.dto.LoginRequest;
import com.lunchpicker.auth.dto.SignupRequest;
import com.lunchpicker.auth.dto.UserResponse;
import com.lunchpicker.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController @RequestMapping("/api/v1/auth") @RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    // 입력을 검증하고 회원가입과 첫 로그인을 처리한다.
    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.signup(request));
    }

    // 입력을 검증하고 로그인 토큰을 발급한다.
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    // Bearer 토큰으로 현재 로그인 사용자를 조회한다.
    @GetMapping("/me")
    public UserResponse me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return authService.me(token(authorization));
    }

    // Bearer 토큰의 로그인 세션을 종료한다.
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        authService.logout(token(authorization));
        return ResponseEntity.noContent().build();
    }

    // Authorization 헤더에서 Bearer 토큰을 추출한다.
    private String token(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ") || authorization.length() <= 7)
            throw new ErrorResponseException(HttpStatus.UNAUTHORIZED,
                    ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."), null);
        return authorization.substring(7);
    }
}
