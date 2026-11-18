package com.lunchpicker.review.service;

import com.lunchpicker.auth.entity.User;
import com.lunchpicker.auth.repository.UserRepository;
import com.lunchpicker.restaurant.entity.Restaurant;
import com.lunchpicker.restaurant.repository.RestaurantRepository;
import com.lunchpicker.review.dto.ReviewRequest;
import com.lunchpicker.review.dto.ReviewResponse;
import com.lunchpicker.review.entity.Review;
import com.lunchpicker.review.repository.ReviewRepository;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.ErrorResponseException;

@Service
@RequiredArgsConstructor
public class ReviewService {
    private final ReviewRepository reviewRepository;
    private final RestaurantRepository restaurantRepository;
    private final UserRepository userRepository;

    // 식당이 존재하는지 확인한 뒤 최신 리뷰 20개를 조회한다.
    @Transactional(readOnly = true)
    public List<ReviewResponse> findPage(long restaurantId, int page) {
        if (!restaurantRepository.existsById(restaurantId)) {
            throw error(HttpStatus.NOT_FOUND, "음식점을 찾을 수 없습니다.");
        }
        return reviewRepository.findPage(restaurantId, PageRequest.of(page, 20)).stream()
                .map(this::toResponse)
                .toList();
    }

    // 로그인 사용자의 리뷰를 해당 식당에 작성한다.
    @Transactional
    public ReviewResponse create(long restaurantId, long authorId, ReviewRequest request) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "음식점을 찾을 수 없습니다."));
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> error(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."));
        Review review = reviewRepository.save(new Review(restaurant, author, request.getRating(), request.getBody().strip()));
        return toResponse(review);
    }

    // 작성자만 자신의 리뷰 평점과 내용을 수정한다.
    @Transactional
    public ReviewResponse update(long restaurantId, long reviewId, long authorId, ReviewRequest request) {
        Review review = findOwned(restaurantId, reviewId, authorId);
        review.update(request.getRating(), request.getBody().strip());
        return toResponse(review);
    }

    // 작성자만 자신의 리뷰를 삭제한다.
    @Transactional
    public void delete(long restaurantId, long reviewId, long authorId) {
        Review review = findOwned(restaurantId, reviewId, authorId);
        reviewRepository.delete(review);
    }

    // 식당 경로와 작성자 ID가 모두 일치하는 리뷰를 찾는다.
    private Review findOwned(long restaurantId, long reviewId, long authorId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "리뷰를 찾을 수 없습니다."));
        if (!Objects.equals(review.getRestaurant().getId(), restaurantId)) {
            throw error(HttpStatus.NOT_FOUND, "리뷰를 찾을 수 없습니다.");
        }
        if (!Objects.equals(review.getAuthor().getId(), authorId)) {
            throw error(HttpStatus.FORBIDDEN, "내 리뷰만 변경할 수 있습니다.");
        }
        return review;
    }

    // 리뷰 엔티티에서 클라이언트에 필요한 필드만 응답으로 옮긴다.
    private ReviewResponse toResponse(Review review) {
        return new ReviewResponse(review.getId(), review.getAuthor().getId(),
                review.getAuthor().getDisplayName(), review.getRating(), review.getBody(),
                review.getCreatedAt(), review.getUpdatedAt());
    }

    // 업무 오류를 ProblemDetail 형태의 HTTP 오류로 만든다.
    private ErrorResponseException error(HttpStatus status, String detail) {
        return new ErrorResponseException(status, ProblemDetail.forStatusAndDetail(status, detail), null);
    }
}
