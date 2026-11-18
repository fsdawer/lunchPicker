package com.lunchpicker.community.dto;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter // 응답 필드의 읽기 메서드를 Lombok이 만든다.
@AllArgsConstructor // 모든 응답 필드를 받는 생성자를 Lombok이 만든다.
public class PostResponse {
    private Long id;
    private Long authorId;
    private String authorDisplayName;
    private String title;
    private String body;
    private Long restaurantId;
    private String restaurantName;
    private Instant createdAt;
    private long viewCount;
    private long commentCount;
}
