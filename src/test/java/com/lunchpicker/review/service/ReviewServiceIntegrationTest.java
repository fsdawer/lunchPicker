package com.lunchpicker.review.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.lunchpicker.auth.entity.User;
import com.lunchpicker.auth.repository.UserRepository;
import com.lunchpicker.restaurant.entity.Restaurant;
import com.lunchpicker.restaurant.repository.RestaurantRepository;
import com.lunchpicker.review.dto.ReviewRequest;
import com.lunchpicker.review.dto.ReviewResponse;
import com.lunchpicker.review.repository.ReviewRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "RUN_DB_TESTS", matches = "true")
class ReviewServiceIntegrationTest {
    @Autowired ReviewService reviewService;
    @Autowired ReviewRepository reviewRepository;
    @Autowired RestaurantRepository restaurantRepository;
    @Autowired UserRepository userRepository;

    // 실제 DB에서 작성·목록·수정·삭제가 같은 식당과 작성자에 연결된다.
    @Test
    void createsListsUpdatesAndDeletesReview() {
        Point location = new GeometryFactory().createPoint(new Coordinate(127.11806, 37.49306));
        location.setSRID(4326);
        Restaurant restaurant = restaurantRepository.save(new Restaurant("리뷰 검증 식당", location));
        User author = userRepository.save(new User("리뷰어", "review_" + UUID.randomUUID().toString().substring(0, 12), "hash"));
        ReviewResponse created = reviewService.create(restaurant.getId(), author.getId(), request(4, "첫 후기"));

        List<ReviewResponse> page = reviewService.findPage(restaurant.getId(), 0);
        assertThat(page).anySatisfy(review -> {
            assertThat(review.getId()).isEqualTo(created.getId());
            assertThat(review.getAuthorId()).isEqualTo(author.getId());
            assertThat(review.getRating()).isEqualTo(4);
        });

        ReviewResponse updated = reviewService.update(restaurant.getId(), created.getId(), author.getId(), request(5, "수정한 후기"));
        assertThat(updated.getRating()).isEqualTo(5);
        assertThat(updated.getBody()).isEqualTo("수정한 후기");
        reviewService.delete(restaurant.getId(), created.getId(), author.getId());
        assertThat(reviewRepository.existsById(created.getId())).isFalse();
    }

    // 리뷰 요청 DTO에 평점과 내용을 설정한다.
    private ReviewRequest request(int rating, String body) {
        ReviewRequest request = new ReviewRequest();
        ReflectionTestUtils.setField(request, "rating", rating);
        ReflectionTestUtils.setField(request, "body", body);
        return request;
    }
}
