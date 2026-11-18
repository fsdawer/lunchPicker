package com.lunchpicker.restaurant.controller;

import com.lunchpicker.auth.service.AuthService;
import com.lunchpicker.restaurant.dto.RestaurantResponse;
import com.lunchpicker.restaurant.dto.RestaurantDetailResponse;
import com.lunchpicker.restaurant.dto.RestaurantFavoriteResponse;
import com.lunchpicker.restaurant.dto.RestaurantMapResponse;
import com.lunchpicker.restaurant.service.RestaurantService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/restaurants")
@RequiredArgsConstructor
public class RestaurantController {
    private final RestaurantService restaurantService;
    private final AuthService authService;

    // 좌표·반경·가격대·정렬값을 검증하고 주변 음식점 한 페이지를 조회한다.
    @GetMapping
    public List<RestaurantResponse> nearby(@RequestParam double latitude, @RequestParam double longitude,
                                           @RequestParam(defaultValue = "3000") int radiusMeters,
                                           @RequestParam(defaultValue = "0") int offset,
                                           @RequestParam(defaultValue = "") String q,
                                           @RequestParam(defaultValue = "0") int minPriceKrw,
                                           @RequestParam(defaultValue = "0") int maxPriceKrw,
                                           @RequestParam(defaultValue = "default") String sort) {
        String keyword = q.strip();
        if (!Double.isFinite(latitude) || latitude < -90 || latitude > 90
                || !Double.isFinite(longitude) || longitude < -180 || longitude > 180
                || radiusMeters < 1 || radiusMeters > 5000 || offset < 0 || offset > 100000
                || keyword.length() > 50 || minPriceKrw < 0 || minPriceKrw > 100000
                || maxPriceKrw < 0 || maxPriceKrw > 100000
                || (maxPriceKrw == 0 && minPriceKrw != 0)
                || (maxPriceKrw > 0 && minPriceKrw > maxPriceKrw)
                || !(sort.equals("default") || sort.equals("favorites") || sort.equals("popular"))) {
            throw new ErrorResponseException(HttpStatus.BAD_REQUEST,
                    ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "위도·경도, 반경, 시작 위치, 검색어, 가격대 또는 정렬이 유효하지 않습니다."), null);
        }
        return restaurantService.findNearby(latitude, longitude, radiusMeters, offset, keyword, minPriceKrw, maxPriceKrw, sort);
    }

    // 상세 진입을 기록해 최근 30일 인기순에 반영한다.
    @PostMapping("/{id}/views")
    public ResponseEntity<Void> recordView(@PathVariable long id) {
        validateId(id);
        restaurantService.recordDetailView(id);
        return ResponseEntity.noContent().build();
    }

    // 로그인 사용자의 식당 찜 상태를 조회한다.
    @GetMapping("/{id}/favorite")
    public RestaurantFavoriteResponse favorite(@PathVariable long id,
                                                @RequestHeader(value = "Authorization", required = false) String authorization) {
        validateId(id);
        return new RestaurantFavoriteResponse(restaurantService.isFavorite(id, userId(authorization)));
    }

    // 로그인 사용자가 식당을 찜한다.
    @PostMapping("/{id}/favorite")
    public RestaurantFavoriteResponse addFavorite(@PathVariable long id,
                                                   @RequestHeader(value = "Authorization", required = false) String authorization) {
        validateId(id);
        restaurantService.addFavorite(id, userId(authorization));
        return new RestaurantFavoriteResponse(true);
    }

    // 로그인 사용자의 식당 찜을 해제한다.
    @DeleteMapping("/{id}/favorite")
    public RestaurantFavoriteResponse removeFavorite(@PathVariable long id,
                                                      @RequestHeader(value = "Authorization", required = false) String authorization) {
        validateId(id);
        restaurantService.removeFavorite(id, userId(authorization));
        return new RestaurantFavoriteResponse(false);
    }

    // WGS84 지도 경계를 검증하고 화면 안의 식당 마커를 반환한다.
    @GetMapping("/map")
    public RestaurantMapResponse map(@RequestParam double south, @RequestParam double north,
                                     @RequestParam double west, @RequestParam double east,
                                     @RequestParam double latitude, @RequestParam double longitude) {
        if (!Double.isFinite(south) || !Double.isFinite(north) || !Double.isFinite(west) || !Double.isFinite(east)
                || !Double.isFinite(latitude) || !Double.isFinite(longitude)
                || south < -90 || north > 90 || west < -180 || east > 180
                || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
                || south >= north || west >= east || north - south > 0.12 || east - west > 0.12) {
            throw new ErrorResponseException(HttpStatus.BAD_REQUEST,
                    ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "지도 범위가 유효하지 않습니다."), null);
        }
        return restaurantService.findMap(south, north, west, east, latitude, longitude);
    }

    // 식당 ID를 검증하고 상세 정보와 메뉴를 반환한다.
    @GetMapping("/{id}")
    public RestaurantDetailResponse detail(@PathVariable long id) {
        validateId(id);
        return restaurantService.findDetail(id);
    }

    // URL의 식당 ID가 양수인지 검증한다.
    private void validateId(long id) {
        if (id < 1) {
            throw new ErrorResponseException(HttpStatus.BAD_REQUEST,
                    ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "식당 ID가 유효하지 않습니다."), null);
        }
    }

    // Bearer 토큰에서 로그인 사용자 ID를 확인한다.
    private long userId(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ") || authorization.length() <= 7) {
            throw new ErrorResponseException(HttpStatus.UNAUTHORIZED,
                    ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."), null);
        }
        return authService.me(authorization.substring(7)).getId();
    }
}
