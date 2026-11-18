package com.lunchpicker.auth.service;

import com.lunchpicker.auth.dto.AuthResponse;
import com.lunchpicker.auth.dto.LoginRequest;
import com.lunchpicker.auth.dto.SignupRequest;
import com.lunchpicker.auth.dto.UserResponse;
import com.lunchpicker.auth.entity.LoginSession;
import com.lunchpicker.auth.entity.User;
import com.lunchpicker.auth.repository.LoginSessionRepository;
import com.lunchpicker.auth.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.ErrorResponseException;

@Service @RequiredArgsConstructor
public class AuthService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final UserRepository userRepository;
    private final LoginSessionRepository loginSessionRepository;
    private final PasswordEncoder passwordEncoder;

    // 아이디 중복을 확인하고 새 계정을 만든 뒤 로그인한다.
    @Transactional
    public AuthResponse signup(SignupRequest request) {
        String loginId = request.getLoginId().strip().toLowerCase(Locale.ROOT);
        if (userRepository.existsByLoginId(loginId)) throw error(HttpStatus.CONFLICT, "이미 가입된 아이디입니다.");
        try {
            User user = userRepository.saveAndFlush(new User(request.getDisplayName().strip(), loginId, passwordEncoder.encode(request.getPassword())));
            return issue(user);
        } catch (DataIntegrityViolationException e) {
            throw error(HttpStatus.CONFLICT, "이미 가입된 아이디입니다.");
        }
    }

    // 아이디와 비밀번호를 확인하고 새 로그인 토큰을 발급한다.
    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByLoginId(request.getLoginId().strip().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> error(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."));
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash()))
            throw error(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다.");
        return issue(user);
    }

    // 유효한 토큰으로 현재 사용자를 조회한다.
    @Transactional(readOnly = true)
    public UserResponse me(String token) {
        LoginSession session = loginSessionRepository.findByTokenHash(hash(token))
                .filter(value -> value.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> error(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."));
        User user = userRepository.findById(session.getUserId())
                .orElseThrow(() -> error(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."));
        return new UserResponse(user.getId(), user.getDisplayName(), user.getLoginId());
    }

    // 현재 토큰의 세션을 삭제해 로그아웃한다.
    @Transactional
    public void logout(String token) {
        loginSessionRepository.deleteByTokenHash(hash(token));
    }

    // 예측할 수 없는 토큰을 만들고 DB에는 해시만 저장한다.
    private AuthResponse issue(User user) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expiry = Instant.now().plus(30, ChronoUnit.DAYS);
        loginSessionRepository.save(new LoginSession(user.getId(), hash(token), expiry));
        return new AuthResponse(token, expiry, user.getId(), user.getDisplayName());
    }

    // 원문 토큰을 SHA-256 해시로 바꾼다.
    private String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    // 일관된 ProblemDetail 오류를 만든다.
    private ErrorResponseException error(HttpStatus status, String detail) {
        return new ErrorResponseException(status, ProblemDetail.forStatusAndDetail(status, detail), null);
    }
}
