package com.lunchpicker.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.lunchpicker.auth.dto.LoginRequest;
import com.lunchpicker.auth.entity.LoginSession;
import com.lunchpicker.auth.entity.User;
import com.lunchpicker.auth.repository.LoginSessionRepository;
import com.lunchpicker.auth.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.ErrorResponseException;

class AuthServiceTest {
    // 잘못된 비밀번호에는 인증 실패를 반환한다.
    @Test
    void rejectsWrongPassword() {
        UserRepository users = org.mockito.Mockito.mock(UserRepository.class);
        LoginSessionRepository sessions = org.mockito.Mockito.mock(LoginSessionRepository.class);
        PasswordEncoder encoder = org.mockito.Mockito.mock(PasswordEncoder.class);
        AuthService service = new AuthService(users, sessions, encoder);
        LoginRequest request = new LoginRequest();
        ReflectionTestUtils.setField(request, "loginId", "tester1");
        ReflectionTestUtils.setField(request, "password", "wrongpass");
        when(users.findByLoginId("tester1")).thenReturn(Optional.of(new User("Tester", "tester1", "hash")));
        when(encoder.matches("wrongpass", "hash")).thenReturn(false);
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ErrorResponseException.class, () -> service.login(request)).getStatusCode());
    }

    // 만료된 토큰으로 사용자 정보를 조회할 수 없다.
    @Test
    void rejectsExpiredSession() {
        UserRepository users = org.mockito.Mockito.mock(UserRepository.class);
        LoginSessionRepository sessions = org.mockito.Mockito.mock(LoginSessionRepository.class);
        AuthService service = new AuthService(users, sessions, org.mockito.Mockito.mock(PasswordEncoder.class));
        when(sessions.findByTokenHash(anyString())).thenReturn(Optional.of(new LoginSession(1L, "hash", Instant.now().minusSeconds(1))));
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ErrorResponseException.class, () -> service.me("expired-token")).getStatusCode());
    }
}
