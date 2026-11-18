package com.lunchpicker.community.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.lunchpicker.auth.entity.User;
import com.lunchpicker.auth.repository.UserRepository;
import com.lunchpicker.community.entity.PostComment;
import com.lunchpicker.community.repository.CommunityPostRepository;
import com.lunchpicker.community.repository.PostCommentRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.ErrorResponseException;

class PostCommentServiceTest {
    private final PostCommentRepository postCommentRepository = mock(PostCommentRepository.class);
    private final PostCommentService postCommentService = new PostCommentService(postCommentRepository,
            mock(CommunityPostRepository.class), mock(UserRepository.class));

    // 다른 사람이 쓴 댓글은 삭제할 수 없다.
    @Test
    void rejectsDeletingAnotherUsersComment() {
        User author = new User("작성자", "commentwriter", "hash");
        ReflectionTestUtils.setField(author, "id", 7L);
        PostComment postComment = new PostComment(11L, author, "안녕하세요");
        ReflectionTestUtils.setField(postComment, "id", 3L);
        when(postCommentRepository.findById(3L)).thenReturn(Optional.of(postComment));

        ErrorResponseException error = assertThrows(ErrorResponseException.class,
                () -> postCommentService.delete(11L, 3L, 8L));
        assertEquals(403, error.getStatusCode().value());
    }
}
