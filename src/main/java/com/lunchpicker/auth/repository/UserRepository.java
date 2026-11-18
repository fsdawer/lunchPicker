package com.lunchpicker.auth.repository;

import com.lunchpicker.auth.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    // 로그인 아이디로 사용자를 조회한다.
    Optional<User> findByLoginId(String loginId);
    // 가입한 로그인 아이디인지 확인한다.
    boolean existsByLoginId(String loginId);
}
