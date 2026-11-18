package com.lunchpicker.restaurant.dto;

import com.lunchpicker.menu.dto.MenuResponse;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class RestaurantDetailResponse {
    private final Long id;
    private final String name;
    private final String address;
    private final String category;
    private final double latitude;
    private final double longitude;
    private final LocalDate sourceSnapshotDate;
    private final List<MenuResponse> menus;
}
