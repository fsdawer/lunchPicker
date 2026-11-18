package com.lunchpicker.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter // 요청 내용의 읽기 메서드를 Lombok이 만든다.
@NoArgsConstructor // Jackson이 JSON 요청을 객체로 만들 생성자를 만든다.
public class PostCommentRequest {
    @NotBlank // 공백만 있는 댓글을 거부한다.
    @Size(max = 1000) // 댓글 내용을 1000자까지 허용한다.
    private String body;
}
