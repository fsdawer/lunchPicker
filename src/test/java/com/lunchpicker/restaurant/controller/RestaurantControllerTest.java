package com.lunchpicker.restaurant.controller;

import com.lunchpicker.restaurant.dto.RestaurantResponse;
import com.lunchpicker.restaurant.service.RestaurantService;
import com.lunchpicker.auth.service.AuthService;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.mockito.Mockito;

class RestaurantControllerTest {

    RestaurantService service = Mockito.mock(RestaurantService.class);
    MockMvc mvc = MockMvcBuilders.standaloneSetup(new RestaurantController(service, Mockito.mock(AuthService.class))).build();

    // 최대 허용 반경을 초과하면 400 응답을 반환하는지 확인한다.
    @Test
    void rejectsRadiusAboveFiveKilometers() throws Exception {
        mvc.perform(get("/api/v1/restaurants").param("latitude", "37.47")
                        .param("longitude", "127.14").param("radiusMeters", "5001"))
                .andExpect(status().isBadRequest());
    }

    // 유효하지 않은 좌표를 거부하는지 확인한다.
    @Test
    void rejectsInvalidCoordinates() throws Exception {
        mvc.perform(get("/api/v1/restaurants").param("latitude", "91")
                        .param("longitude", "127.14"))
                .andExpect(status().isBadRequest());
    }

    // 주변 음식점의 이름과 거리를 응답하는지 확인한다.
    @Test
    void returnsNearbyRestaurants() throws Exception {
        org.mockito.Mockito.when(service.findNearby(37.47, 127.14, 1000, 0, "", 0, 0, "default"))
                .thenReturn(List.of(new RestaurantResponse(1L, "테스트 식당", 37.471, 127.141, 142)));

        mvc.perform(get("/api/v1/restaurants").param("latitude", "37.47")
                        .param("longitude", "127.14").param("radiusMeters", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("테스트 식당"))
                .andExpect(jsonPath("$[0].distanceMeters").value(142));
    }

    // 반경을 지정하지 않으면 3 km 안의 음식점을 조회하는지 확인한다.
    @Test
    void defaultsToThreeKilometers() throws Exception {
        Mockito.when(service.findNearby(37.47, 127.14, 3000, 0, "", 0, 0, "default"))
                .thenReturn(List.of(new RestaurantResponse(2L, "3 km 식당", 37.48, 127.15, 1200)));

        mvc.perform(get("/api/v1/restaurants").param("latitude", "37.47")
                        .param("longitude", "127.14"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("3 km 식당"));
    }

    // 식대가 지정되면 서비스에 금액을 전달한다.
    @Test
    void passesMaximumMenuPrice() throws Exception {
        Mockito.when(service.findNearby(37.47, 127.14, 3000, 0, "", 0, 10000, "default"))
                .thenReturn(List.of(new RestaurantResponse(4L, "만원 이하 식당", 37.47, 127.14, 0)));

        mvc.perform(get("/api/v1/restaurants").param("latitude", "37.47")
                        .param("longitude", "127.14").param("maxPriceKrw", "10000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("만원 이하 식당"));
    }

    // 허용 범위를 벗어난 식대는 400 응답으로 거부한다.
    @Test
    void rejectsInvalidMaximumMenuPrice() throws Exception {
        mvc.perform(get("/api/v1/restaurants").param("latitude", "37.47")
                        .param("longitude", "127.14").param("maxPriceKrw", "-1"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/restaurants").param("latitude", "37.47")
                        .param("longitude", "127.14").param("maxPriceKrw", "100001"))
                .andExpect(status().isBadRequest());
    }

    // 알 수 없는 정렬과 거꾸로 된 가격대는 400으로 거부한다.
    @Test
    void rejectsInvalidFilterOptions() throws Exception {
        mvc.perform(get("/api/v1/restaurants").param("latitude", "37.47")
                        .param("longitude", "127.14").param("sort", "unknown"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/restaurants").param("latitude", "37.47")
                        .param("longitude", "127.14").param("minPriceKrw", "20000")
                        .param("maxPriceKrw", "10000"))
                .andExpect(status().isBadRequest());
    }

    // 찜 상태는 토큰이 없는 사용자에게 공개하지 않는다.
    @Test
    void favoriteRequiresLogin() throws Exception {
        mvc.perform(get("/api/v1/restaurants/1/favorite")).andExpect(status().isUnauthorized());
    }

    // 음수 시작 위치로 목록을 요청하면 400 응답을 반환한다.
    @Test
    void rejectsNegativeOffset() throws Exception {
        mvc.perform(get("/api/v1/restaurants").param("latitude", "37.47")
                        .param("longitude", "127.14").param("offset", "-1"))
                .andExpect(status().isBadRequest());
    }

    // 검색어의 앞뒤 공백을 제거해 서비스에 전달한다.
    @Test
    void searchesWithTrimmedKeyword() throws Exception {
        Mockito.when(service.findNearby(37.47, 127.14, 3000, 0, "국밥", 0, 0, "default"))
                .thenReturn(List.of(new RestaurantResponse(3L, "남위례 국밥", 37.47, 127.14, 0)));

        mvc.perform(get("/api/v1/restaurants").param("latitude", "37.47")
                        .param("longitude", "127.14").param("q", "  국밥  "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("남위례 국밥"));
    }

    // 50자를 넘는 검색어는 400 응답으로 거부한다.
    @Test
    void rejectsTooLongKeyword() throws Exception {
        mvc.perform(get("/api/v1/restaurants").param("latitude", "37.47")
                        .param("longitude", "127.14").param("q", "가".repeat(51)))
                .andExpect(status().isBadRequest());
    }

    // 식당 ID로 상세 정보를 반환한다.
    @Test
    void returnsRestaurantDetail() throws Exception {
        Mockito.when(service.findDetail(1L)).thenReturn(new com.lunchpicker.restaurant.dto.RestaurantDetailResponse(
                1L, "테스트 식당", "서울 송파구", "한식", 37.47, 127.14, null, List.of()));

        mvc.perform(get("/api/v1/restaurants/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("테스트 식당"))
                .andExpect(jsonPath("$.address").value("서울 송파구"));
    }

    // 유효하지 않은 식당 ID를 거부한다.
    @Test
    void rejectsInvalidRestaurantId() throws Exception {
        mvc.perform(get("/api/v1/restaurants/0")).andExpect(status().isBadRequest());
    }

    // 지도 범위의 좌표 순서가 잘못되면 400 응답을 반환한다.
    @Test
    void rejectsInvalidMapBounds() throws Exception {
        mvc.perform(get("/api/v1/restaurants/map").param("south", "37.5")
                        .param("north", "37.4").param("west", "127.1").param("east", "127.2")
                        .param("latitude", "37.47").param("longitude", "127.14"))
                .andExpect(status().isBadRequest());
    }

    // 한 번에 너무 넓은 지도 범위를 조회하지 못하게 한다.
    @Test
    void rejectsMapBoundsWiderThanLimit() throws Exception {
        mvc.perform(get("/api/v1/restaurants/map").param("south", "37.4")
                        .param("north", "37.53").param("west", "127.1").param("east", "127.2")
                        .param("latitude", "37.47").param("longitude", "127.14"))
                .andExpect(status().isBadRequest());
    }

    // 올바른 지도 범위에서 마커 목록을 반환한다.
    @Test
    void returnsMapMarkers() throws Exception {
        Mockito.when(service.findMap(37.4, 37.5, 127.1, 127.2, 37.47, 127.14))
                .thenReturn(new com.lunchpicker.restaurant.dto.RestaurantMapResponse(List.of(), false));

        mvc.perform(get("/api/v1/restaurants/map").param("south", "37.4")
                        .param("north", "37.5").param("west", "127.1").param("east", "127.2")
                        .param("latitude", "37.47").param("longitude", "127.14"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.truncated").value(false));
    }
}
