package com.lunchpicker.meetup.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "meal_meetups", schema = "lunchpicker")
@Getter // 엔티티 필드의 읽기 메서드를 Lombok이 만든다.
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA가 사용할 기본 생성자를 만든다.
public class MealMeetup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "host_user_id", nullable = false)
    private Long hostUserId;

    @Column(name = "restaurant_id", nullable = false)
    private Long restaurantId;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(nullable = false)
    private short capacity;

    @Column(nullable = false)
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // 모집 작성자, 식당, 식사 시간, 정원으로 새 모집을 만든다.
    public MealMeetup(Long hostUserId, Long restaurantId, Instant startsAt, int capacity) {
        this.hostUserId = hostUserId;
        this.restaurantId = restaurantId;
        this.startsAt = startsAt;
        this.capacity = (short) capacity;
        this.status = "OPEN";
        this.createdAt = Instant.now();
    }
}
