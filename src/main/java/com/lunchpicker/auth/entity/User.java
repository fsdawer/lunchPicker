package com.lunchpicker.auth.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users", schema = "lunchpicker")
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 40)
    private String displayName;
    @Column(unique = true, length = 254)
    private String loginId;
    @Column(length = 100)
    private String passwordHash;
    @Column(nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
    @Column(nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;

    // 신규 사용자의 로그인 정보를 저장할 엔티티를 만든다.
    public User(String displayName, String loginId, String passwordHash) {
        this.displayName = displayName;
        this.loginId = loginId;
        this.passwordHash = passwordHash;
    }
}
