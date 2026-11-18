package com.lunchpicker.review.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.lunchpicker.auth.entity.User;
import com.lunchpicker.auth.repository.UserRepository;
import com.lunchpicker.restaurant.entity.Restaurant;
import com.lunchpicker.restaurant.repository.RestaurantRepository;
import com.lunchpicker.review.dto.ReviewRequest;
import com.lunchpicker.review.entity.Review;
import com.lunchpicker.review.repository.ReviewRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.ErrorResponseException;

class ReviewServiceTest {
    private final ReviewRepository reviewRepository = mock(ReviewRepository.class);
    private final RestaurantRepository restaurantRepository = mock(RestaurantRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final ReviewService reviewService = new ReviewService(reviewRepository, restaurantRepository, userRepository);

    // 다른 사용자는 리뷰를 수정할 수 없다.
    @Test
    void rejectsUpdateByAnotherUser() {
        User author = new User("작성자", "writer1", "hash");
        ReflectionTestUtils.setField(author, "id", 7L);
        Restaurant restaurant = mock(Restaurant.class);
        when(restaurant.getId()).thenReturn(1L);
        Review review = new Review(restaurant, author, 4, "맛있어요");
        when(reviewRepository.findById(2L)).thenReturn(Optional.of(review));

        ErrorResponseException error = assertThrows(ErrorResponseException.class,
                () -> reviewService.update(1L, 2L, 8L, new ReviewRequest()));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verifyNoInteractions(restaurantRepository);
    }

    // 다른 사용자는 리뷰를 삭제할 수 없다.
    @Test
    void rejectsDeleteByAnotherUser() {
        User author = new User("작성자", "writer2", "hash");
        ReflectionTestUtils.setField(author, "id", 7L);
        Restaurant restaurant = mock(Restaurant.class);
        when(restaurant.getId()).thenReturn(1L);
        Review review = new Review(restaurant, author, 4, "맛있어요");
        when(reviewRepository.findById(2L)).thenReturn(Optional.of(review));

        ErrorResponseException error = assertThrows(ErrorResponseException.class,
                () -> reviewService.delete(1L, 2L, 8L));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
    }
}
