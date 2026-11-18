package com.lunchpicker.auth.repository;

import com.lunchpicker.auth.entity.LoginSession;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoginSessionRepository extends JpaRepository<LoginSession, Long> {
    // 토큰 해시로 세션을 조회한다.
    Optional<LoginSession> findByTokenHash(String tokenHash);
    // 로그아웃한 토큰을 삭제한다.
    void deleteByTokenHash(String tokenHash);
}
