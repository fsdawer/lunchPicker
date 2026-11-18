package com.lunchpicker.community.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lunchpicker.auth.entity.User;
import com.lunchpicker.auth.repository.UserRepository;
import com.lunchpicker.community.dto.CreatePostRequest;
import com.lunchpicker.community.dto.PostResponse;
import com.lunchpicker.community.dto.UpdatePostRequest;
import com.lunchpicker.community.entity.CommunityPost;
import com.lunchpicker.community.repository.CommunityPostRepository;
import com.lunchpicker.community.repository.PostCommentRepository;
import org.mockito.ArgumentCaptor;
import com.lunchpicker.restaurant.repository.RestaurantRepository;
import java.util.Optional;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.ErrorResponseException;

class CommunityPostServiceTest {
    private final CommunityPostRepository communityPostRepository = mock(CommunityPostRepository.class);
    private final RestaurantRepository restaurantRepository = mock(RestaurantRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final PostCommentRepository postCommentRepository = mock(PostCommentRepository.class);
    private final CommunityPostService service = new CommunityPostService(communityPostRepository, restaurantRepository,
            userRepository, postCommentRepository);

    // 식당 없이 글을 작성하면 작성자와 WGS84 좌표를 보존한다.
    @Test
    void createsPostWithoutRestaurant() {
        CreatePostRequest request = request(37.49306, 127.11806);
        when(userRepository.findById(7L)).thenReturn(Optional.of(new User("작성자", "writer7", "hash")));
        when(communityPostRepository.save(any(CommunityPost.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PostResponse response = service.createPost(7L, request);

        ArgumentCaptor<CommunityPost> captor = ArgumentCaptor.forClass(CommunityPost.class);
        verify(communityPostRepository).save(captor.capture());
        assertEquals("작성자", captor.getValue().getAuthor().getDisplayName());
        assertEquals("오늘 점심", response.getTitle());
        assertEquals(127.11806, captor.getValue().getAreaLocation().getX(), 0.00001);
        assertEquals(37.49306, captor.getValue().getAreaLocation().getY(), 0.00001);
        assertNull(captor.getValue().getRestaurant());
    }

    // 범위를 벗어난 좌표는 저장 전에 거부한다.
    @Test
    void rejectsInvalidCoordinates() {
        ErrorResponseException error = assertThrows(ErrorResponseException.class,
                () -> service.createPost(7L, request(91, 127.11806)));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
    }

    // 다른 사용자는 글을 수정할 수 없다.
    @Test
    void rejectsUpdatingAnotherUsersPost() {
        User author = new User("작성자", "writer7", "hash");
        ReflectionTestUtils.setField(author, "id", 7L);
        CommunityPost communityPost = new CommunityPost(author, "원제목", "원문",
                new GeometryFactory().createPoint(new Coordinate(127.11806, 37.49306)), null);
        when(communityPostRepository.findById(11L)).thenReturn(Optional.of(communityPost));
        UpdatePostRequest updatePostRequest = new UpdatePostRequest();
        ReflectionTestUtils.setField(updatePostRequest, "body", "수정문");
        ReflectionTestUtils.setField(updatePostRequest, "title", "수정 제목");

        ErrorResponseException error = assertThrows(ErrorResponseException.class,
                () -> service.updatePost(11L, 8L, updatePostRequest));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        assertEquals("원문", communityPost.getBody());
    }

    // 작성자만 글을 삭제할 수 있다.
    @Test
    void deletesOnlyOwnedPost() {
        User author = new User("작성자", "writer7", "hash");
        ReflectionTestUtils.setField(author, "id", 7L);
        CommunityPost communityPost = new CommunityPost(author, "원제목", "원문",
                new GeometryFactory().createPoint(new Coordinate(127.11806, 37.49306)), null);
        when(communityPostRepository.findById(11L)).thenReturn(Optional.of(communityPost));

        service.deletePost(11L, 7L);

        verify(communityPostRepository).delete(communityPost);
    }

    // 요청 DTO에 위도와 경도를 넣는다.
    private CreatePostRequest request(double latitude, double longitude) {
        CreatePostRequest request = new CreatePostRequest();
        ReflectionTestUtils.setField(request, "body", "점심 먹으러 갑니다");
        ReflectionTestUtils.setField(request, "title", "  오늘 점심  ");
        ReflectionTestUtils.setField(request, "latitude", latitude);
        ReflectionTestUtils.setField(request, "longitude", longitude);
        return request;
    }
}
