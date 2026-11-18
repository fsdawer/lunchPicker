package com.lunchpicker.meetup.repository;

import com.lunchpicker.meetup.entity.MealMeetup;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface MealMeetupRepository extends JpaRepository<MealMeetup, Long> {
    // 식당 위치가 중심점에서 3km 이내인 예정된 모집을 시간순으로 찾는다.
    @Query(value = """
            SELECT m.* FROM lunchpicker.meal_meetups m
            JOIN lunchpicker.restaurants r ON r.id = m.restaurant_id
            WHERE m.starts_at > CURRENT_TIMESTAMP AND m.status = 'OPEN'
              AND public.ST_DWithin(r.location, CAST(public.ST_SetSRID(public.ST_MakePoint(:longitude, :latitude), 4326) AS public.geography), 3000)
            ORDER BY m.starts_at, m.id LIMIT 50
            """, nativeQuery = true)
    List<MealMeetup> findNearby(@Param("latitude") double latitude, @Param("longitude") double longitude);

    // 정원 검사와 참여 변경을 한 트랜잭션으로 직렬화하도록 모집 행을 잠근다.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT mealMeetup FROM MealMeetup mealMeetup WHERE mealMeetup.id = :id")
    Optional<MealMeetup> findLocked(@Param("id") Long id);

    // 모집의 현재 참여자 수를 센다.
    @Query(value = "SELECT count(*) FROM lunchpicker.meal_meetup_members WHERE meetup_id = :meetupId", nativeQuery = true)
    int countMembers(@Param("meetupId") Long meetupId);

    // 사용자가 모집에 이미 참여했는지 확인한다.
    @Query(value = "SELECT EXISTS(SELECT 1 FROM lunchpicker.meal_meetup_members WHERE meetup_id = :meetupId AND user_id = :userId)", nativeQuery = true)
    boolean isMember(@Param("meetupId") Long meetupId, @Param("userId") Long userId);

    // 모집 참여자를 기본키 중복 방지와 함께 저장한다.
    @Modifying
    @Query(value = "INSERT INTO lunchpicker.meal_meetup_members (meetup_id, user_id) VALUES (:meetupId, :userId)", nativeQuery = true)
    void addMember(@Param("meetupId") Long meetupId, @Param("userId") Long userId);

    // 모집에서 사용자의 참여 기록을 지운다.
    @Modifying
    @Query(value = "DELETE FROM lunchpicker.meal_meetup_members WHERE meetup_id = :meetupId AND user_id = :userId", nativeQuery = true)
    void removeMember(@Param("meetupId") Long meetupId, @Param("userId") Long userId);

    // 식사 시작 후 24시간까지 사용자가 참여한 채팅방을 조회한다.
    @Query(value = """
            SELECT m.* FROM lunchpicker.meal_meetups m
            JOIN lunchpicker.meal_meetup_members mm ON mm.meetup_id = m.id
            WHERE mm.user_id = :userId AND m.starts_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
            ORDER BY m.starts_at DESC, m.id DESC LIMIT 50
            """, nativeQuery = true)
    List<MealMeetup> findMine(@Param("userId") Long userId);
}
