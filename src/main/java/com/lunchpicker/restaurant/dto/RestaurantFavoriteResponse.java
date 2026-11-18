package com.lunchpicker.restaurant.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter // 찜 상태를 JSON 응답으로 읽을 Getter를 만든다.
@AllArgsConstructor // 현재 찜 상태를 받는 생성자를 만든다.
public class RestaurantFavoriteResponse {
    private final boolean favorite;
}
