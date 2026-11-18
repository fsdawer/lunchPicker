package com.lunchpicker.menu.controller;

import com.lunchpicker.menu.dto.MenuResponse;
import com.lunchpicker.menu.service.MenuService;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@Validated
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    // 요청한 식당의 메뉴 목록을 반환한다.
    @GetMapping("/api/v1/restaurants/{restaurantId}/menus")
    public List<MenuResponse> list(@PathVariable @Positive Long restaurantId) {
        return menuService.findByRestaurantId(restaurantId);
    }
}
