package com.lunchpicker.meetup.dto;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter // 응답 필드의 읽기 메서드를 Lombok이 만든다.
@AllArgsConstructor // 모든 응답 필드를 받는 생성자를 Lombok이 만든다.
public class MeetupResponse {
    private final Long id;
    private final Long hostUserId;
    private final String hostDisplayName;
    private final Long restaurantId;
    private final String restaurantName;
    private final Instant startsAt;
    private final int capacity;
    private final int memberCount;
    private final String status;
    private final boolean joined;
}
