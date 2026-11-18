package com.lunchpicker.meetup.service;

import com.lunchpicker.auth.entity.User;
import com.lunchpicker.auth.repository.UserRepository;
import com.lunchpicker.meetup.dto.CreateMeetupRequest;
import com.lunchpicker.meetup.dto.MeetupResponse;
import com.lunchpicker.meetup.entity.MealMeetup;
import com.lunchpicker.meetup.repository.MealMeetupRepository;
import com.lunchpicker.restaurant.entity.Restaurant;
import com.lunchpicker.restaurant.repository.RestaurantRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.ErrorResponseException;

@Service
@RequiredArgsConstructor // final 의존성을 받는 생성자를 Lombok이 만든다.
public class MeetupService {
    private final MealMeetupRepository mealMeetupRepository;
    private final RestaurantRepository restaurantRepository;
    private final UserRepository userRepository;

    // 식당과 식사 시간을 검증하고 호스트가 자동 참여하는 모집을 만든다.
    @Transactional
    public MeetupResponse create(long userId, CreateMeetupRequest request) {
        Instant now = Instant.now();
        if (request.getStartsAt() == null || !request.getStartsAt().isAfter(now)
                || request.getStartsAt().isAfter(now.plus(30, ChronoUnit.DAYS))) {
            throw error(HttpStatus.BAD_REQUEST, "식사 시간은 앞으로 30일 안에서 선택해 주세요.");
        }
        if (request.getCapacity() < 2 || request.getCapacity() > 8) {
            throw error(HttpStatus.BAD_REQUEST, "정원은 2~8명이어야 합니다.");
        }
        userRepository.findById(userId).orElseThrow(() -> error(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."));
        restaurantRepository.findById(request.getRestaurantId())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "음식점을 찾을 수 없습니다."));
        MealMeetup mealMeetup = mealMeetupRepository.saveAndFlush(new MealMeetup(userId,
                request.getRestaurantId(), request.getStartsAt(), request.getCapacity()));
        mealMeetupRepository.addMember(mealMeetup.getId(), userId);
        return toResponse(mealMeetup, userId);
    }

    // 선택한 지역의 3km 안에 있는 예정 모집을 반환한다.
    @Transactional(readOnly = true)
    public List<MeetupResponse> findNearby(double latitude, double longitude, Long userId) {
        if (!Double.isFinite(latitude) || latitude < -90 || latitude > 90
                || !Double.isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw error(HttpStatus.BAD_REQUEST, "위도·경도가 유효하지 않습니다.");
        }
        return mealMeetupRepository.findNearby(latitude, longitude).stream()
                .map(mealMeetup -> toResponse(mealMeetup, userId)).toList();
    }

    // 모집 ID로 상세 정보와 현재 참여자 수를 반환한다.
    @Transactional(readOnly = true)
    public MeetupResponse findDetail(long meetupId, Long userId) {
        MealMeetup mealMeetup = mealMeetupRepository.findById(meetupId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "모집을 찾을 수 없습니다."));
        return toResponse(mealMeetup, userId);
    }

    // 현재 사용자가 참여한 예정 모집을 반환한다.
    @Transactional(readOnly = true)
    public List<MeetupResponse> findMine(long userId) {
        return mealMeetupRepository.findMine(userId).stream()
                .map(mealMeetup -> toResponse(mealMeetup, userId)).toList();
    }

    // 행 잠금 안에서 중복 참여와 정원을 확인한 뒤 사용자를 추가한다.
    @Transactional
    public MeetupResponse join(long meetupId, long userId) {
        MealMeetup mealMeetup = mealMeetupRepository.findLocked(meetupId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "모집을 찾을 수 없습니다."));
        if (!mealMeetup.getStartsAt().isAfter(Instant.now()) || !"OPEN".equals(mealMeetup.getStatus())) {
            throw error(HttpStatus.CONFLICT, "참여할 수 없는 모집입니다.");
        }
        if (mealMeetupRepository.isMember(meetupId, userId)) {
            throw error(HttpStatus.CONFLICT, "이미 참여 중입니다.");
        }
        if (mealMeetupRepository.countMembers(meetupId) >= mealMeetup.getCapacity()) {
            throw error(HttpStatus.CONFLICT, "정원이 찼습니다.");
        }
        mealMeetupRepository.addMember(meetupId, userId);
        return toResponse(mealMeetup, userId);
    }

    // 호스트를 제외한 참여자가 모집에서 나간다.
    @Transactional
    public void leave(long meetupId, long userId) {
        MealMeetup mealMeetup = mealMeetupRepository.findLocked(meetupId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "모집을 찾을 수 없습니다."));
        if (Objects.equals(mealMeetup.getHostUserId(), userId)) {
            throw error(HttpStatus.CONFLICT, "모집 작성자는 나갈 수 없습니다.");
        }
        if (!mealMeetupRepository.isMember(meetupId, userId)) {
            throw error(HttpStatus.CONFLICT, "참여 중인 모집이 아닙니다.");
        }
        mealMeetupRepository.removeMember(meetupId, userId);
    }

    // 모집 엔티티에 식당·작성자 이름과 현재 인원을 붙여 응답을 만든다.
    private MeetupResponse toResponse(MealMeetup mealMeetup, Long userId) {
        Restaurant restaurant = restaurantRepository.findById(mealMeetup.getRestaurantId())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "음식점을 찾을 수 없습니다."));
        User host = userRepository.findById(mealMeetup.getHostUserId())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "작성자를 찾을 수 없습니다."));
        return new MeetupResponse(mealMeetup.getId(), mealMeetup.getHostUserId(), host.getDisplayName(),
                restaurant.getId(), restaurant.getName(), mealMeetup.getStartsAt(),
                mealMeetup.getCapacity(), mealMeetupRepository.countMembers(mealMeetup.getId()),
                mealMeetup.getStatus(), userId != null && mealMeetupRepository.isMember(mealMeetup.getId(), userId));
    }

    // 상태와 설명을 ProblemDetail HTTP 오류로 만든다.
    private ErrorResponseException error(HttpStatus status, String detail) {
        return new ErrorResponseException(status, ProblemDetail.forStatusAndDetail(status, detail), null);
    }
}
