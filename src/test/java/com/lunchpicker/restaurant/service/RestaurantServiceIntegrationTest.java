package com.lunchpicker.restaurant.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.lunchpicker.restaurant.entity.Restaurant;
import com.lunchpicker.auth.entity.User;
import com.lunchpicker.auth.repository.UserRepository;
import com.lunchpicker.restaurant.repository.RestaurantRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.ErrorResponseException;

@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "RUN_DB_TESTS", matches = "true")
class RestaurantServiceIntegrationTest {
    @Autowired RestaurantService service;
    @Autowired RestaurantRepository repository;
    @Autowired UserRepository userRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    // 식당 상세 정보에 등록 메뉴와 좌표를 함께 반환한다.
    @Test
    void returnsDetailWithMenus() {
        Point location = new GeometryFactory().createPoint(new Coordinate(127.13917, 37.46282));
        location.setSRID(4326);
        Restaurant restaurant = repository.save(new Restaurant("상세 테스트 식당", location));
        repository.flush();
        jdbcTemplate.update("INSERT INTO lunchpicker.menus (restaurant_id, name, price_krw) VALUES (?, ?, ?)",
                restaurant.getId(), "국밥", 9000);

        var detail = service.findDetail(restaurant.getId());

        assertThat(detail.getName()).isEqualTo("상세 테스트 식당");
        assertThat(detail.getLatitude()).isEqualTo(37.46282);
        assertThat(detail.getMenus()).hasSize(1);
        assertThat(detail.getMenus().get(0).getPriceKrw()).isEqualTo(9000);
    }

    // 같은 사용자가 여러 번 찜해도 한 건만 저장되고 해제 후에는 조회되지 않는다.
    @Test
    void favoriteIsUniquePerUserAndCanBeRemoved() {
        Point location = new GeometryFactory().createPoint(new Coordinate(127.13917, 37.46282));
        location.setSRID(4326);
        Restaurant restaurant = repository.save(new Restaurant("찜 검증 식당", location));
        User user = userRepository.save(new User("작성자", "fav_" + UUID.randomUUID().toString().substring(0, 12), "hash"));
        repository.flush();

        service.addFavorite(restaurant.getId(), user.getId());
        service.addFavorite(restaurant.getId(), user.getId());

        assertThat(service.isFavorite(restaurant.getId(), user.getId())).isTrue();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM lunchpicker.restaurant_favorites WHERE user_id = ? AND restaurant_id = ?",
                Long.class, user.getId(), restaurant.getId())).isEqualTo(1);

        service.removeFavorite(restaurant.getId(), user.getId());
        assertThat(service.isFavorite(restaurant.getId(), user.getId())).isFalse();
    }

    // 존재하지 않는 식당은 404 오류로 응답한다.
    @Test
    void missingRestaurantReturnsNotFound() {
        assertThatThrownBy(() -> service.findDetail(Long.MAX_VALUE))
                .isInstanceOfSatisfying(ErrorResponseException.class,
                        error -> {
                            assertThat(error.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
                            assertThat(error.getBody().getDetail()).isEqualTo("음식점을 찾을 수 없습니다.");
                        });
    }
}
