package com.lunchpicker.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter // 요청 본문 필드의 읽기 메서드를 Lombok이 만든다.
@NoArgsConstructor // Jackson이 JSON 요청 본문을 객체로 만들 때 사용할 생성자를 만든다.
public class UpdatePostRequest {
    @NotBlank // 수정 시에도 제목이 비어 있을 수 없다.
    @Size(max = 100) // 제목 길이를 DB 제약과 맞춘다.
    private String title;

    @NotBlank // 공백만 있는 글을 거부한다.
    @Size(max = 1000) // 본문을 최대 1000자로 제한한다.
    private String body;
}
