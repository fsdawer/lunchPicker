package com.lunchpicker.meetup.controller;

import com.lunchpicker.auth.service.AuthService;
import com.lunchpicker.meetup.dto.CreateMeetupRequest;
import com.lunchpicker.meetup.dto.MeetupResponse;
import com.lunchpicker.meetup.service.MeetupService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/meetups")
@RequiredArgsConstructor // final 의존성을 받는 생성자를 Lombok이 만든다.
public class MeetupController {
    private final MeetupService meetupService;
    private final AuthService authService;

    // 선택한 지역의 예정된 같이 먹기 모집을 공개 조회한다.
    @GetMapping
    public List<MeetupResponse> nearby(@RequestParam double latitude, @RequestParam double longitude,
                                       @RequestHeader(value = "Authorization", required = false) String authorization) {
        return meetupService.findNearby(latitude, longitude, optionalUserId(authorization));
    }

    // 로그인한 사용자가 참여 중인 예정 모집을 조회한다.
    @GetMapping("/mine")
    public List<MeetupResponse> mine(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return meetupService.findMine(userId(authorization));
    }

    // 새 모집을 만들고 작성자를 첫 참여자로 등록한다.
    @PostMapping
    public ResponseEntity<MeetupResponse> create(@RequestHeader(value = "Authorization", required = false) String authorization,
                                                  @Valid @RequestBody CreateMeetupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(meetupService.create(userId(authorization), request));
    }

    // 모집 ID로 상세 정보를 공개 조회한다.
    @GetMapping("/{meetupId}")
    public MeetupResponse detail(@PathVariable long meetupId,
                                 @RequestHeader(value = "Authorization", required = false) String authorization) {
        validateId(meetupId);
        return meetupService.findDetail(meetupId, optionalUserId(authorization));
    }

    // 로그인 사용자를 모집에 참여시킨다.
    @PostMapping("/{meetupId}/join")
    public MeetupResponse join(@PathVariable long meetupId,
                               @RequestHeader(value = "Authorization", required = false) String authorization) {
        validateId(meetupId);
        return meetupService.join(meetupId, userId(authorization));
    }

    // 로그인 사용자가 모집 참여를 취소한다.
    @DeleteMapping("/{meetupId}/join")
    public ResponseEntity<Void> leave(@PathVariable long meetupId,
                                      @RequestHeader(value = "Authorization", required = false) String authorization) {
        validateId(meetupId);
        meetupService.leave(meetupId, userId(authorization));
        return ResponseEntity.noContent().build();
    }

    // 로그인 토큰에서 서버가 확인한 사용자 ID를 얻는다.
    private long userId(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ") || authorization.length() <= 7) {
            throw new ErrorResponseException(HttpStatus.UNAUTHORIZED,
                    ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."), null);
        }
        return authService.me(authorization.substring(7)).getId();
    }

    // 인증 헤더가 있으면 사용자 ID를 얻고 없으면 공개 조회로 처리한다.
    private Long optionalUserId(String authorization) {
        return authorization == null ? null : userId(authorization);
    }

    // 모집 ID가 양수인지 확인한다.
    private void validateId(long meetupId) {
        if (meetupId < 1) {
            throw new ErrorResponseException(HttpStatus.BAD_REQUEST,
                    ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "모집 ID가 유효하지 않습니다."), null);
        }
    }
}
