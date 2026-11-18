package com.lunchpicker.meetup.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter // 요청 필드의 읽기 메서드를 Lombok이 만든다.
@NoArgsConstructor // Jackson이 JSON 요청 본문을 객체로 만들 생성자를 만든다.
public class CreateMeetupRequest {
    @NotNull
    private Long restaurantId;

    @NotNull
    private Instant startsAt;

    @Min(2)
    @Max(8)
    private int capacity;
}
