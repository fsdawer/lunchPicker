package com.lunchpicker.menu.repository;

import com.lunchpicker.menu.entity.Menu;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenuRepository extends JpaRepository<Menu, Long> {

    // 식당 ID에 해당하는 메뉴를 ID 순서로 조회한다.
    List<Menu> findByRestaurantIdOrderByIdAsc(Long restaurantId);

}
