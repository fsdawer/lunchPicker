package com.lunchpicker.review.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.lunchpicker.auth.dto.UserResponse;
import com.lunchpicker.auth.service.AuthService;
import com.lunchpicker.review.dto.ReviewRequest;
import com.lunchpicker.review.service.ReviewService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.ErrorResponseException;

class ReviewControllerTest {
    private final ReviewService reviewService = mock(ReviewService.class);
    private final AuthService authService = mock(AuthService.class);
    private final ReviewController controller = new ReviewController(reviewService, authService);

    // 로그인 헤더 없이 리뷰를 쓰면 저장하지 않고 401을 반환한다.
    @Test
    void rejectsUnauthenticatedCreate() {
        ErrorResponseException error = assertThrows(ErrorResponseException.class,
                () -> controller.create(1L, null, new ReviewRequest()));
        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatusCode());
        verify(reviewService, never()).create(eq(1L), eq(1L), any());
    }

    // 삭제 요청의 작성자 ID는 토큰에서만 결정한다.
    @Test
    void deletesAsAuthenticatedUser() {
        when(authService.me("token")).thenReturn(new UserResponse(7L, "작성자", "writer7"));
        controller.delete(1L, 2L, "Bearer token");
        verify(reviewService).delete(1L, 2L, 7L);
    }

    // 평점 범위와 공백만 있는 내용은 API 요청 경계에서 거부한다.
    @Test
    void rejectsInvalidReviewInput() throws Exception {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller).setValidator(validator).build();
        when(authService.me("token")).thenReturn(new UserResponse(7L, "작성자", "writer7"));

        mvc.perform(post("/api/v1/restaurants/1/reviews")
                .header("Authorization", "Bearer token")
                .contentType("application/json")
                .content("{\"rating\":0,\"body\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    // 음수 페이지는 저장소에 접근하기 전에 거부한다.
    @Test
    void rejectsNegativePage() {
        ErrorResponseException error = assertThrows(ErrorResponseException.class,
                () -> controller.list(1L, -1));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
    }
}
