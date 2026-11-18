package com.lunchpicker.review.controller;

import com.lunchpicker.auth.service.AuthService;
import com.lunchpicker.review.dto.ReviewRequest;
import com.lunchpicker.review.dto.ReviewResponse;
import com.lunchpicker.review.service.ReviewService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/restaurants/{restaurantId}/reviews")
@RequiredArgsConstructor
public class ReviewController {
    private final ReviewService reviewService;
    private final AuthService authService;

    // 식당의 최신 리뷰 한 페이지를 공개 조회한다.
    @GetMapping
    public List<ReviewResponse> list(@PathVariable long restaurantId,
                                     @RequestParam(defaultValue = "0") int page) {
        validateIds(restaurantId, null);
        if (page < 0 || page > 10000) {
            throw error(HttpStatus.BAD_REQUEST, "페이지 번호가 유효하지 않습니다.");
        }
        return reviewService.findPage(restaurantId, page);
    }

    // 토큰의 사용자로 평점과 리뷰 내용을 저장한다.
    @PostMapping
    public ResponseEntity<ReviewResponse> create(@PathVariable long restaurantId,
                                                  @RequestHeader(value = "Authorization", required = false) String authorization,
                                                  @Valid @RequestBody ReviewRequest request) {
        validateIds(restaurantId, null);
        long authorId = authService.me(token(authorization)).getId();
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.create(restaurantId, authorId, request));
    }

    // 작성자 인증 후 해당 식당의 리뷰를 수정한다.
    @PutMapping("/{reviewId}")
    public ReviewResponse update(@PathVariable long restaurantId, @PathVariable long reviewId,
                                 @RequestHeader(value = "Authorization", required = false) String authorization,
                                 @Valid @RequestBody ReviewRequest request) {
        validateIds(restaurantId, reviewId);
        long authorId = authService.me(token(authorization)).getId();
        return reviewService.update(restaurantId, reviewId, authorId, request);
    }

    // 작성자 인증 후 해당 식당의 리뷰를 삭제한다.
    @DeleteMapping("/{reviewId}")
    public ResponseEntity<Void> delete(@PathVariable long restaurantId, @PathVariable long reviewId,
                                       @RequestHeader(value = "Authorization", required = false) String authorization) {
        validateIds(restaurantId, reviewId);
        long authorId = authService.me(token(authorization)).getId();
        reviewService.delete(restaurantId, reviewId, authorId);
        return ResponseEntity.noContent().build();
    }

    // 식당과 리뷰 경로 ID가 양수인지 확인한다.
    private void validateIds(long restaurantId, Long reviewId) {
        if (restaurantId < 1 || (reviewId != null && reviewId < 1)) {
            throw error(HttpStatus.BAD_REQUEST, "식당 또는 리뷰 ID가 유효하지 않습니다.");
        }
    }

    // Authorization 헤더에서 Bearer 토큰을 꺼낸다.
    private String token(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ") || authorization.length() <= 7) {
            throw error(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return authorization.substring(7);
    }

    // 상태와 설명을 ProblemDetail 오류로 만든다.
    private ErrorResponseException error(HttpStatus status, String detail) {
        return new ErrorResponseException(status, ProblemDetail.forStatusAndDetail(status, detail), null);
    }
}
