package com.lunchpicker.menu.service;

import com.lunchpicker.menu.dto.MenuResponse;
import com.lunchpicker.menu.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuService {

    private final MenuRepository menuRepository;

    // 식당의 메뉴를 조회하고 API 응답 DTO로 변환한다.
    @Transactional(readOnly = true)
    public List<MenuResponse> findByRestaurantId(Long restaurantId) {
        return menuRepository.findByRestaurantIdOrderByIdAsc(restaurantId)
                .stream()
                .map(menu -> new MenuResponse(
                        menu.getId(),
                        menu.getName(),
                        menu.getPriceKrw()))
                .toList();
    }
}
