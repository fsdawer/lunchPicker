package com.lunchpicker.community.controller;

import com.lunchpicker.auth.service.AuthService;
import com.lunchpicker.community.dto.PostCommentRequest;
import com.lunchpicker.community.dto.PostCommentResponse;
import com.lunchpicker.community.service.PostCommentService;
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

@RestController // 댓글 API의 반환값을 JSON으로 보낸다.
@RequestMapping("/api/v1/community/posts/{postId}/comments") // 글별 댓글의 공통 경로다.
@RequiredArgsConstructor // final 의존성 생성자를 Lombok이 만든다.
public class PostCommentController {
    private final PostCommentService postCommentService;
    private final AuthService authService;

    // 글의 댓글 한 페이지를 공개 조회한다.
    @GetMapping // 기본 경로의 GET 요청이다.
    public List<PostCommentResponse> list(@PathVariable long postId,
                                          @RequestParam(defaultValue = "0") int page) {
        validateIds(postId, null);
        if (page < 0 || page > 10000) throw error(HttpStatus.BAD_REQUEST, "페이지 번호가 유효하지 않습니다.");
        return postCommentService.findPage(postId, page);
    }

    // 로그인 사용자의 댓글을 작성한다.
    @PostMapping // 기본 경로의 POST 요청이다.
    public ResponseEntity<PostCommentResponse> create(@PathVariable long postId,
                                                      @RequestHeader(value = "Authorization", required = false) String authorization,
                                                      @Valid @RequestBody PostCommentRequest request) {
        validateIds(postId, null);
        long authorId = authService.me(token(authorization)).getId();
        return ResponseEntity.status(HttpStatus.CREATED).body(postCommentService.create(postId, authorId, request));
    }

    // 로그인한 작성자만 자신의 댓글을 삭제한다.
    @DeleteMapping("/{commentId}") // URL의 commentId에 해당하는 댓글을 삭제한다.
    public ResponseEntity<Void> delete(@PathVariable long postId, @PathVariable long commentId,
                                       @RequestHeader(value = "Authorization", required = false) String authorization) {
        validateIds(postId, commentId);
        long authorId = authService.me(token(authorization)).getId();
        postCommentService.delete(postId, commentId, authorId);
        return ResponseEntity.noContent().build();
    }

    // 글과 댓글 ID가 양수인지 확인한다.
    private void validateIds(long postId, Long commentId) {
        if (postId < 1 || (commentId != null && commentId < 1)) {
            throw error(HttpStatus.BAD_REQUEST, "글 또는 댓글 ID가 유효하지 않습니다.");
        }
    }

    // Bearer 인증 헤더에서 토큰을 꺼낸다.
    private String token(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ") || authorization.length() <= 7) {
            throw error(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return authorization.substring(7);
    }

    // 상태와 설명을 ProblemDetail HTTP 오류로 만든다.
    private ErrorResponseException error(HttpStatus status, String detail) {
        return new ErrorResponseException(status, ProblemDetail.forStatusAndDetail(status, detail), null);
    }
}
