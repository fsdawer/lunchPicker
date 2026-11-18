package com.lunchpicker.auth.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "login_sessions", schema = "lunchpicker")
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class LoginSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long userId;
    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;
    @Column(nullable = false)
    private Instant expiresAt;

    // 사용자와 토큰 해시로 만료되는 로그인 세션을 만든다.
    public LoginSession(Long userId, String tokenHash, Instant expiresAt) {
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }
}
