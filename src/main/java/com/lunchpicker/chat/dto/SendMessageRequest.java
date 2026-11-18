package com.lunchpicker.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter // 요청 필드의 읽기 메서드를 Lombok이 만든다.
@NoArgsConstructor // Jackson이 JSON 요청 본문을 객체로 만들 생성자를 만든다.
public class SendMessageRequest {
    @NotBlank
    @Size(max = 1000)
    private String body;
}
