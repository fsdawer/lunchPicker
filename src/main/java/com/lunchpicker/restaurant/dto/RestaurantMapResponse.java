package com.lunchpicker.restaurant.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class RestaurantMapResponse {
    private final List<RestaurantMapPoint> restaurants;
    private final boolean truncated;
}
