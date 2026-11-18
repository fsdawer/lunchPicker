package com.lunchpicker.restaurant.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.lunchpicker.restaurant.dto.RestaurantResponse;
import com.lunchpicker.restaurant.entity.Restaurant;
import com.lunchpicker.auth.entity.User;
import com.lunchpicker.auth.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "RUN_DB_TESTS", matches = "true")
class RestaurantRepositoryIntegrationTest {
    @Autowired RestaurantRepository repository;
    @Autowired UserRepository userRepository;
    @Autowired JdbcTemplate jdbcTemplate;
    private final GeometryFactory geometryFactory = new GeometryFactory();

    // 저장된 식당 중 반경 안의 식당만 거리와 함께 반환하는지 확인한다.
    @Test
    void findsOnlyRestaurantsWithinRadius() {
        Restaurant inside = repository.save(new Restaurant("반경 테스트 안쪽", point(127.13917, 37.46282)));
        Restaurant outside = repository.save(new Restaurant("반경 테스트 바깥쪽", point(127.15917, 37.46282)));
        repository.flush();

        List<RestaurantResponse> found = repository.findNearby(37.46282, 127.13917, 1000, 0, "", 0, 0, "default");
        List<Long> ids = found.stream().map(RestaurantResponse::getId).toList();

        assertThat(ids).contains(inside.getId()).doesNotContain(outside.getId());
        assertThat(found).anySatisfy(restaurant -> {
            assertThat(restaurant.getId()).isEqualTo(inside.getId());
            assertThat(restaurant.getName()).isEqualTo("반경 테스트 안쪽");
            assertThat(restaurant.getDistanceMeters()).isZero();
        });
    }

    // 같은 거리의 음식점도 ID 순서로 고정해 다음 페이지에서 중복 없이 조회한다.
    @Test
    void findsNextPageInStableOrder() {
        Restaurant first = repository.save(new Restaurant("첫 번째 식당", point(128.123, 35.123)));
        Restaurant second = repository.save(new Restaurant("두 번째 식당", point(128.123, 35.123)));
        repository.flush();

        List<RestaurantResponse> found = repository.findNearby(35.123, 128.123, 1000, 1, "", 0, 0, "default");

        assertThat(found).extracting(RestaurantResponse::getId).containsExactly(second.getId());
        assertThat(first.getId()).isLessThan(second.getId());
    }

    // 한글 이름의 부분 일치만 반환하고 다른 이름과 반경 밖 식당은 제외한다.
    @Test
    void searchesNameWithinRadius() {
        Restaurant match = repository.save(new Restaurant("남위례 국밥", point(127.13917, 37.46282)));
        Restaurant other = repository.save(new Restaurant("남위례 분식", point(127.13917, 37.46282)));
        Restaurant outside = repository.save(new Restaurant("멀리 있는 국밥", point(127.15917, 37.46282)));
        repository.flush();

        List<Long> ids = repository.findNearby(37.46282, 127.13917, 1000, 0, "국밥", 0, 0, "default")
                .stream().map(RestaurantResponse::getId).toList();

        assertThat(ids).contains(match.getId()).doesNotContain(other.getId(), outside.getId());
    }

    // SQL LIKE의 특수문자도 일반 문자로 검색한다.
    @Test
    void searchesWildcardCharactersLiterally() {
        Restaurant percent = repository.save(new Restaurant("할인%식당", point(127.13917, 37.46282)));
        Restaurant ordinary = repository.save(new Restaurant("할인식당", point(127.13917, 37.46282)));
        repository.flush();

        List<Long> ids = repository.findNearby(37.46282, 127.13917, 1000, 0, "%", 0, 0, "default")
                .stream().map(RestaurantResponse::getId).toList();

        assertThat(ids).contains(percent.getId()).doesNotContain(ordinary.getId());
    }

    // 등록된 메뉴 중 하나가 식대 이하인 식당만 필터링하고 가격 미등록 식당은 제외한다.
    @Test
    void filtersByAffordableMenuPrice() {
        Restaurant affordable = repository.save(new Restaurant("식대 검증 저렴", point(127.13917, 37.46282)));
        Restaurant expensive = repository.save(new Restaurant("식대 검증 비쌈", point(127.13917, 37.46282)));
        Restaurant unknown = repository.save(new Restaurant("식대 검증 미등록", point(127.13917, 37.46282)));
        repository.flush();
        jdbcTemplate.update("INSERT INTO lunchpicker.menus (restaurant_id, name, price_krw) VALUES (?, ?, ?)", affordable.getId(), "점심", 9000);
        jdbcTemplate.update("INSERT INTO lunchpicker.menus (restaurant_id, name, price_krw) VALUES (?, ?, ?)", expensive.getId(), "점심", 14000);

        List<Long> ids = repository.findNearby(37.46282, 127.13917, 1000, 0, "식대 검증", 0, 10000, "default")
                .stream().map(RestaurantResponse::getId).toList();

        assertThat(ids).contains(affordable.getId()).doesNotContain(expensive.getId(), unknown.getId());
    }

    // 최저·최고 가격을 모두 만족하는 메뉴가 있는 식당만 남긴다.
    @Test
    void filtersByMenuPriceRange() {
        Restaurant low = repository.save(new Restaurant("가격범위 검증 낮음", point(127.13917, 37.46282)));
        Restaurant middle = repository.save(new Restaurant("가격범위 검증 중간", point(127.13917, 37.46282)));
        Restaurant high = repository.save(new Restaurant("가격범위 검증 높음", point(127.13917, 37.46282)));
        repository.flush();
        jdbcTemplate.update("INSERT INTO lunchpicker.menus (restaurant_id, name, price_krw) VALUES (?, '식사', 7000)", low.getId());
        jdbcTemplate.update("INSERT INTO lunchpicker.menus (restaurant_id, name, price_krw) VALUES (?, '식사', 12000)", middle.getId());
        jdbcTemplate.update("INSERT INTO lunchpicker.menus (restaurant_id, name, price_krw) VALUES (?, '식사', 20000)", high.getId());

        List<Long> ids = repository.findNearby(37.46282, 127.13917, 1000, 0, "가격범위 검증", 10000, 15000, "default")
                .stream().map(RestaurantResponse::getId).toList();

        assertThat(ids).containsExactly(middle.getId());
    }

    // 찜 수가 많은 식당을 거리보다 앞에 두고 같은 수는 거리순으로 둔다.
    @Test
    void sortsByFavorites() {
        Restaurant near = repository.save(new Restaurant("찜정렬 검증 가까움", point(127.13917, 37.46282)));
        Restaurant far = repository.save(new Restaurant("찜정렬 검증 멀리", point(127.14017, 37.46282)));
        User user = userRepository.save(new User("검증자", "fav_" + UUID.randomUUID().toString().substring(0, 12), "hash"));
        repository.flush();
        repository.addFavorite(user.getId(), far.getId());

        List<Long> ids = repository.findNearby(37.46282, 127.13917, 1000, 0, "찜정렬 검증", 0, 0, "favorites")
                .stream().map(RestaurantResponse::getId).toList();

        assertThat(ids).containsExactly(far.getId(), near.getId());
    }

    // 인기순은 30일 전 조회를 빼고 최근 상세 진입 수만 비교한다.
    @Test
    void sortsByRecentDetailViews() {
        Restaurant near = repository.save(new Restaurant("인기정렬 검증 가까움", point(127.13917, 37.46282)));
        Restaurant far = repository.save(new Restaurant("인기정렬 검증 멀리", point(127.14017, 37.46282)));
        repository.flush();
        jdbcTemplate.update("INSERT INTO lunchpicker.restaurant_detail_views (restaurant_id, viewed_at) VALUES (?, CURRENT_TIMESTAMP - INTERVAL '31 days')", near.getId());
        repository.recordDetailView(far.getId());

        List<Long> ids = repository.findNearby(37.46282, 127.13917, 1000, 0, "인기정렬 검증", 0, 0, "popular")
                .stream().map(RestaurantResponse::getId).toList();

        assertThat(ids).containsExactly(far.getId(), near.getId());
    }

    // 지도 경계 안의 식당만 마커 좌표로 조회한다.
    @Test
    void findsMarkersInsideBounds() {
        Restaurant inside = repository.save(new Restaurant("지도 안쪽", point(128.123, 35.123)));
        Restaurant outside = repository.save(new Restaurant("지도 바깥쪽", point(128.20, 35.50)));
        repository.flush();

        var found = repository.findInBounds(35.12, 35.13, 128.12, 128.13, 35.123, 128.123);

        assertThat(found).anySatisfy(point -> {
            assertThat(point.getId()).isEqualTo(inside.getId());
            assertThat(point.getLatitude()).isEqualTo(35.123);
        });
        assertThat(found).noneMatch(point -> point.getId().equals(outside.getId()));
        assertThat(repository.findInBounds(35.12, 35.13, 128.12, 128.13, 35.5, 128.5))
                .noneMatch(point -> point.getId().equals(inside.getId()));
    }

    // 경도·위도 좌표로 SRID 4326의 지점을 만든다.
    private Point point(double longitude, double latitude) {
        Point point = geometryFactory.createPoint(new Coordinate(longitude, latitude));
        point.setSRID(4326);
        return point;
    }
}
