package com.lunchpicker.community.service;

import com.lunchpicker.auth.entity.User;
import com.lunchpicker.auth.repository.UserRepository;
import com.lunchpicker.community.dto.PostCommentRequest;
import com.lunchpicker.community.dto.PostCommentResponse;
import com.lunchpicker.community.entity.PostComment;
import com.lunchpicker.community.repository.CommunityPostRepository;
import com.lunchpicker.community.repository.PostCommentRepository;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.ErrorResponseException;

@Service // 댓글 업무 규칙을 수행하는 Spring 서비스다.
@RequiredArgsConstructor // final 의존성을 받는 생성자를 Lombok이 만든다.
public class PostCommentService {
    private final PostCommentRepository postCommentRepository;
    private final CommunityPostRepository communityPostRepository;
    private final UserRepository userRepository;

    // 글 존재 여부를 확인한 뒤 최신 댓글 20개씩 조회한다.
    @Transactional(readOnly = true) // 댓글 조회 중 연관 작성자 이름도 읽는다.
    public List<PostCommentResponse> findPage(long postId, int page) {
        if (!communityPostRepository.existsById(postId)) {
            throw error(HttpStatus.NOT_FOUND, "글을 찾을 수 없습니다.");
        }
        return postCommentRepository.findPage(postId, PageRequest.of(page, 20)).stream()
                .map(this::toResponse).toList();
    }

    // 로그인 사용자의 댓글을 글에 저장한다.
    @Transactional // 글·사용자 확인과 댓글 저장을 한 트랜잭션으로 실행한다.
    public PostCommentResponse create(long postId, long authorId, PostCommentRequest request) {
        if (!communityPostRepository.existsById(postId)) {
            throw error(HttpStatus.NOT_FOUND, "글을 찾을 수 없습니다.");
        }
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> error(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."));
        PostComment postComment = postCommentRepository.save(new PostComment(postId, author, request.getBody().strip()));
        return toResponse(postComment);
    }

    // 글 경로와 작성자가 모두 일치하는 댓글만 삭제한다.
    @Transactional // 권한 확인과 삭제를 한 트랜잭션으로 실행한다.
    public void delete(long postId, long commentId, long authorId) {
        PostComment postComment = postCommentRepository.findById(commentId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다."));
        if (!Objects.equals(postComment.getPostId(), postId)) {
            throw error(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다.");
        }
        if (!Objects.equals(postComment.getAuthor().getId(), authorId)) {
            throw error(HttpStatus.FORBIDDEN, "내 댓글만 삭제할 수 있습니다.");
        }
        postCommentRepository.delete(postComment);
    }

    // 댓글 엔티티를 공개 응답 필드로 변환한다.
    private PostCommentResponse toResponse(PostComment postComment) {
        return new PostCommentResponse(postComment.getId(), postComment.getAuthor().getId(),
                postComment.getAuthor().getDisplayName(), postComment.getBody(), postComment.getCreatedAt());
    }

    // 상태와 설명을 ProblemDetail HTTP 오류로 만든다.
    private ErrorResponseException error(HttpStatus status, String detail) {
        return new ErrorResponseException(status, ProblemDetail.forStatusAndDetail(status, detail), null);
    }
}
