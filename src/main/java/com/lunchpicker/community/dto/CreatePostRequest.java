package com.lunchpicker.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter // 요청 본문 필드의 읽기 메서드를 Lombok이 만든다.
@NoArgsConstructor // Jackson이 JSON 요청 본문을 객체로 만들 때 사용할 생성자를 만든다.
public class CreatePostRequest {
    @NotBlank // 새 글에는 공백이 아닌 제목이 필요하다.
    @Size(max = 100) // 목록에 표시할 제목을 최대 100자로 제한한다.
    private String title;

    @NotBlank // 공백만 있는 글을 거부한다.
    @Size(max = 1000) // 본문을 최대 1000자로 제한한다.
    private String body;

    @NotNull // 글을 보여줄 지역의 위도가 필요하다.
    private Double latitude;

    @NotNull // 글을 보여줄 지역의 경도가 필요하다.
    private Double longitude;

    private Long restaurantId;
}
