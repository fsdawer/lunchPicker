package com.lunchpicker.restaurant.repository;

import com.lunchpicker.restaurant.dto.RestaurantResponse;
import com.lunchpicker.restaurant.dto.RestaurantMapPoint;
import com.lunchpicker.restaurant.entity.Restaurant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {
    // PostGIS 반경과 메뉴 가격을 먼저 걸고 요청한 정렬 기준으로 음식점 200개를 조회한다.
    @Query(value = """
            SELECT r.id, r.name,
                   public.ST_Y(CAST(r.location AS public.geometry)) AS latitude,
                   public.ST_X(CAST(r.location AS public.geometry)) AS longitude,
                   CAST(ROUND(public.ST_Distance(r.location, CAST(public.ST_SetSRID(public.ST_MakePoint(:longitude, :latitude), 4326) AS public.geography))) AS integer) AS distanceMeters
            FROM lunchpicker.restaurants r
            WHERE public.ST_DWithin(r.location, CAST(public.ST_SetSRID(public.ST_MakePoint(:longitude, :latitude), 4326) AS public.geography), :radiusMeters)
              AND strpos(lower(r.name), lower(:keyword)) > 0
              AND (:maxPriceKrw = 0 OR EXISTS (
                  SELECT 1 FROM lunchpicker.menus m
                  WHERE m.restaurant_id = r.id AND m.price_krw BETWEEN :minPriceKrw AND :maxPriceKrw))
            ORDER BY CASE WHEN :sort = 'favorites' THEN
                    (SELECT COUNT(*) FROM lunchpicker.restaurant_favorites f WHERE f.restaurant_id = r.id) END DESC NULLS LAST,
                     CASE WHEN :sort = 'popular' THEN
                    (SELECT COUNT(*) FROM lunchpicker.restaurant_detail_views v
                     WHERE v.restaurant_id = r.id AND v.viewed_at >= CURRENT_TIMESTAMP - INTERVAL '30 days') END DESC NULLS LAST,
                     distanceMeters, r.id
            LIMIT 200 OFFSET :offset
            """, nativeQuery = true)

    List<RestaurantResponse> findNearby(@Param("latitude") double latitude,
                                        @Param("longitude") double longitude,
                                        @Param("radiusMeters") int radiusMeters,
                                        @Param("offset") int offset,
                                        @Param("keyword") String keyword,
                                        @Param("minPriceKrw") int minPriceKrw,
                                        @Param("maxPriceKrw") int maxPriceKrw,
                                        @Param("sort") String sort);

    // 중복 찜 요청은 기본키 충돌을 무시해 한 사용자당 식당 한 번만 저장한다.
    @Modifying
    @Query(value = "INSERT INTO lunchpicker.restaurant_favorites (user_id, restaurant_id) VALUES (:userId, :restaurantId) ON CONFLICT DO NOTHING", nativeQuery = true)
    int addFavorite(@Param("userId") long userId, @Param("restaurantId") long restaurantId);

    // 현재 사용자의 식당 찜을 삭제한다.
    @Modifying
    @Query(value = "DELETE FROM lunchpicker.restaurant_favorites WHERE user_id = :userId AND restaurant_id = :restaurantId", nativeQuery = true)
    int removeFavorite(@Param("userId") long userId, @Param("restaurantId") long restaurantId);

    // 현재 사용자가 이 식당을 찜했는지 확인한다.
    @Query(value = "SELECT EXISTS (SELECT 1 FROM lunchpicker.restaurant_favorites WHERE user_id = :userId AND restaurant_id = :restaurantId)", nativeQuery = true)
    boolean isFavorite(@Param("userId") long userId, @Param("restaurantId") long restaurantId);

    // 상세 화면에 진입한 기록을 최근 30일 인기순 집계용으로 남긴다.
    @Modifying
    @Query(value = "INSERT INTO lunchpicker.restaurant_detail_views (restaurant_id) VALUES (:restaurantId)", nativeQuery = true)
    int recordDetailView(@Param("restaurantId") long restaurantId);

    // 지도 화면 경계 안의 음식점 좌표를 ID 순으로 최대 501개 조회한다.
    @Query(value = """
            SELECT r.id, r.name,
                   public.ST_Y(CAST(r.location AS public.geometry)) AS latitude,
                   public.ST_X(CAST(r.location AS public.geometry)) AS longitude
            FROM lunchpicker.restaurants r
            WHERE public.ST_Intersects(r.location,
                    CAST(public.ST_MakeEnvelope(:west, :south, :east, :north, 4326) AS public.geography))
              AND public.ST_DWithin(r.location,
                    CAST(public.ST_SetSRID(public.ST_MakePoint(:longitude, :latitude), 4326) AS public.geography), 3000)
            ORDER BY r.id
            LIMIT 501
            """, nativeQuery = true)
    List<RestaurantMapPoint> findInBounds(@Param("south") double south, @Param("north") double north,
                                           @Param("west") double west, @Param("east") double east,
                                           @Param("latitude") double latitude, @Param("longitude") double longitude);
}
