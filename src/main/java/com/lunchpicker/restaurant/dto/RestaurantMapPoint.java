package com.lunchpicker.restaurant.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class RestaurantMapPoint {
    private final Long id;
    private final String name;
    private final double latitude;
    private final double longitude;
}
