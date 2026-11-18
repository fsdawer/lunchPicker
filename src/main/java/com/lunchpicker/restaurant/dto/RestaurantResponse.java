package com.lunchpicker.restaurant.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class RestaurantResponse {
    private final long id;
    private final String name;
    private final double latitude;
    private final double longitude;
    private final int distanceMeters;
}
