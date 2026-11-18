package com.lunchpicker.community.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.lunchpicker.auth.dto.UserResponse;
import com.lunchpicker.auth.service.AuthService;
import com.lunchpicker.community.dto.CreatePostRequest;
import com.lunchpicker.community.service.CommunityPostService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.ErrorResponseException;

class CommunityPostControllerTest {
    private final CommunityPostService communityPostService = mock(CommunityPostService.class);
    private final AuthService authService = mock(AuthService.class);
    private final CommunityPostController controller = new CommunityPostController(communityPostService, authService);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(controller).build();

    // 토큰이 없는 글 작성은 401로 거부한다.
    @Test
    void rejectsPostWithoutLogin() {
        ErrorResponseException error = assertThrows(ErrorResponseException.class,
                () -> controller.create(null, new CreatePostRequest()));
        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatusCode());
        verify(communityPostService, never()).createPost(eq(1L), any());
    }

    // 로그인 토큰에서 얻은 사용자 ID로 글을 작성한다.
    @Test
    void usesAuthenticatedAuthor() {
        when(authService.me("valid-token")).thenReturn(new UserResponse(7L, "작성자", "writer7"));
        controller.create("Bearer valid-token", new CreatePostRequest());
        verify(communityPostService).createPost(eq(7L), any(CreatePostRequest.class));
    }

    // 잘못된 좌표 형식은 목록 조회 전에 400으로 거부한다.
    @Test
    void rejectsMalformedCoordinates() throws Exception {
        mvc.perform(get("/api/v1/community/posts").param("latitude", "invalid")
                .param("longitude", "127.11806")).andExpect(status().isBadRequest());
    }
}
