package com.lunchpicker.community.controller;

import com.lunchpicker.auth.service.AuthService;
import com.lunchpicker.community.dto.CreatePostRequest;
import com.lunchpicker.community.dto.PostResponse;
import com.lunchpicker.community.dto.UpdatePostRequest;
import com.lunchpicker.community.service.CommunityPostService;
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

@RestController // 반환값을 JSON 응답으로 보내는 HTTP 컨트롤러다.
@RequestMapping("/api/v1/community/posts") // 이 컨트롤러의 공통 URL 경로다.
@RequiredArgsConstructor // final 의존성을 받는 생성자를 Lombok이 만든다.
public class CommunityPostController {
    private final CommunityPostService communityPostService;
    private final AuthService authService;

    // Bearer 토큰으로 작성자를 확인한 뒤 지역 글을 생성한다.
    @PostMapping // POST 요청을 글 생성 메서드에 연결한다.
    public ResponseEntity<PostResponse> create(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreatePostRequest request) {
        long authorId = authService.me(token(authorization)).getId();
        return ResponseEntity.status(HttpStatus.CREATED).body(communityPostService.createPost(authorId, request));
    }


    // 글 ID를 확인하고 공개 상세 정보를 반환한다.
    @GetMapping("/{postId}") // URL의 postId에 해당하는 글을 조회한다.
    public PostResponse detail(@PathVariable long postId) {
        validatePostId(postId);
        return communityPostService.findDetail(postId);
    }

    // 상세 화면에 진입한 횟수를 기록하고 현재 글 정보를 반환한다.
    @PostMapping("/{postId}/views") // 별도 POST로 조회수를 변경해 GET은 읽기 전용으로 유지한다.
    public PostResponse recordView(@PathVariable long postId) {
        validatePostId(postId);
        return communityPostService.recordView(postId);
    }

    // 로그인 토큰의 작성자 ID로 글 수정 권한을 확인한다.
    @PutMapping("/{postId}") // URL의 postId에 해당하는 글을 수정한다.
    public PostResponse update(
            @PathVariable long postId,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody UpdatePostRequest request) {
        validatePostId(postId);
        long authorId = authService.me(token(authorization)).getId();
        return communityPostService.updatePost(postId, authorId, request);
    }

    // 로그인 토큰의 작성자 ID로 글 삭제 권한을 확인한다.
    @DeleteMapping("/{postId}") // URL의 postId에 해당하는 글을 삭제한다.
    public ResponseEntity<Void> delete(
            @PathVariable long postId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        validatePostId(postId);
        long authorId = authService.me(token(authorization)).getId();
        communityPostService.deletePost(postId, authorId);
        return ResponseEntity.noContent().build();
    }

    // URL의 글 ID가 양수인지 확인한다.
    private void validatePostId(long postId) {
        if (postId < 1) {
            throw new ErrorResponseException(
                    HttpStatus.BAD_REQUEST,
                    ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "글 ID가 유효하지 않습니다."),
                    null
            );
        }
    }


    // 선택한 지역 중심에서 3km 이내의 최근 글을 조회한다.
    @GetMapping // 기본 경로에서 주변 글 목록을 조회한다.
    public List<PostResponse> nearby(@RequestParam double latitude, @RequestParam double longitude) {
        return communityPostService.findNearby(latitude, longitude);
    }


    // 잘못된 Authorization 헤더를 401로 거부하고 Bearer 토큰을 추출한다.
    private String token(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ") || authorization.length() <= 7) {
            throw new ErrorResponseException(HttpStatus.UNAUTHORIZED,
                    ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."), null);
        }
        return authorization.substring(7);
    }
}
