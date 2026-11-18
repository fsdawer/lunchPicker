package com.lunchpicker.restaurant.service;

import com.lunchpicker.restaurant.dto.RestaurantResponse;
import com.lunchpicker.restaurant.dto.RestaurantDetailResponse;
import com.lunchpicker.restaurant.dto.RestaurantMapPoint;
import com.lunchpicker.restaurant.dto.RestaurantMapResponse;
import com.lunchpicker.menu.dto.MenuResponse;
import com.lunchpicker.menu.repository.MenuRepository;
import com.lunchpicker.restaurant.repository.RestaurantRepository;
import com.lunchpicker.restaurant.entity.Restaurant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RestaurantService {

    private final RestaurantRepository restaurantRepository;
    private final MenuRepository menuRepository;

    // 검색어·반경·가격대·정렬에 맞는 음식점 페이지를 읽기 전용으로 조회한다.
    @Transactional(readOnly = true)
    public List<RestaurantResponse> findNearby(double latitude, double longitude, int radiusMeters, int offset,
                                               String keyword, int minPriceKrw, int maxPriceKrw, String sort) {
        return restaurantRepository.findNearby(latitude, longitude, radiusMeters, offset, keyword, minPriceKrw, maxPriceKrw, sort);
    }

    // 존재하는 식당을 한 사용자당 한 번만 찜한다.
    @Transactional
    public void addFavorite(long restaurantId, long userId) {
        requireRestaurant(restaurantId);
        restaurantRepository.addFavorite(userId, restaurantId);
    }

    // 현재 사용자의 찜을 해제한다.
    @Transactional
    public void removeFavorite(long restaurantId, long userId) {
        requireRestaurant(restaurantId);
        restaurantRepository.removeFavorite(userId, restaurantId);
    }

    // 식당 존재를 확인한 뒤 현재 사용자의 찜 상태를 반환한다.
    @Transactional(readOnly = true)
    public boolean isFavorite(long restaurantId, long userId) {
        requireRestaurant(restaurantId);
        return restaurantRepository.isFavorite(userId, restaurantId);
    }

    // 상세 화면 진입을 기록해 최근 30일 인기순에 반영한다.
    @Transactional
    public void recordDetailView(long restaurantId) {
        requireRestaurant(restaurantId);
        restaurantRepository.recordDetailView(restaurantId);
    }

    // 잘못된 식당 ID가 집계나 찜 테이블에 들어가지 않도록 존재를 검증한다.
    private void requireRestaurant(long restaurantId) {
        if (!restaurantRepository.existsById(restaurantId)) {
            throw new ErrorResponseException(HttpStatus.NOT_FOUND,
                    ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "음식점을 찾을 수 없습니다."), null);
        }
    }

    // 식당 기본 정보와 등록된 메뉴를 상세 응답으로 조회한다.
    @Transactional(readOnly = true)
    public RestaurantDetailResponse findDetail(long id) {
        Restaurant restaurant = restaurantRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "음식점을 찾을 수 없습니다."));
        List<MenuResponse> menus = menuRepository.findByRestaurantIdOrderByIdAsc(id).stream()
                .map(menu -> new MenuResponse(menu.getId(), menu.getName(), menu.getPriceKrw()))
                .toList();
        return new RestaurantDetailResponse(restaurant.getId(), restaurant.getName(),
                restaurant.getAddress(), restaurant.getCategory(), restaurant.getLocation().getY(),
                restaurant.getLocation().getX(), restaurant.getSourceSnapshotDate(), menus);
    }

    // 현재 지도 경계의 마커를 최대 500개 반환하고 잘린 결과인지 알려준다.
    @Transactional(readOnly = true)
    public RestaurantMapResponse findMap(double south, double north, double west, double east,
                                         double latitude, double longitude) {
        List<RestaurantMapPoint> points = restaurantRepository.findInBounds(south, north, west, east, latitude, longitude);
        boolean truncated = points.size() > 500;
        return new RestaurantMapResponse(truncated ? points.subList(0, 500) : points, truncated);
    }
}
