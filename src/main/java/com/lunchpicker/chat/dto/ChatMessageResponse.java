package com.lunchpicker.chat.dto;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter // 응답 필드의 읽기 메서드를 Lombok이 만든다.
@AllArgsConstructor // 모든 응답 필드를 받는 생성자를 Lombok이 만든다.
public class ChatMessageResponse {
    private final Long id;
    private final Long senderId;
    private final String senderDisplayName;
    private final String body;
    private final Instant createdAt;
}
