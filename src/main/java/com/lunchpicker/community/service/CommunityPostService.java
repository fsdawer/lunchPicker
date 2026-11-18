package com.lunchpicker.community.service;

import com.lunchpicker.auth.entity.User;
import com.lunchpicker.auth.repository.UserRepository;
import com.lunchpicker.community.dto.CreatePostRequest;
import com.lunchpicker.community.dto.PostResponse;
import com.lunchpicker.community.dto.UpdatePostRequest;
import com.lunchpicker.community.entity.CommunityPost;
import com.lunchpicker.community.repository.CommunityPostRepository;
import com.lunchpicker.community.repository.PostCommentRepository;
import com.lunchpicker.restaurant.entity.Restaurant;
import com.lunchpicker.restaurant.repository.RestaurantRepository;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.ErrorResponseException;

@Service // 업무 규칙을 수행하는 Spring 서비스로 등록한다.
@RequiredArgsConstructor // final 필드를 받는 생성자를 Lombok이 만들어 의존성을 주입한다.
public class CommunityPostService {
    private final CommunityPostRepository communityPostRepository;
    private final RestaurantRepository restaurantRepository;
    private final UserRepository userRepository;
    private final PostCommentRepository postCommentRepository;


    // 글 ID에 해당하는 공개 상세 정보를 조회한다.
    @Transactional(readOnly = true) // 조회 작업을 읽기 전용 트랜잭션으로 실행한다.
    public PostResponse findDetail(long postId) {
        CommunityPost communityPost = communityPostRepository.findById(postId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "글을 찾을 수 없습니다"));

        return toResponse(communityPost);
    }

    // 상세 화면 진입을 기록하고 증가한 조회수를 포함한 글을 반환한다.
    @Transactional // 조회수 증가와 응답 조회를 한 작업으로 실행한다.
    public PostResponse recordView(long postId) {
        if (communityPostRepository.incrementViewCount(postId) == 0) {
            throw error(HttpStatus.NOT_FOUND, "글을 찾을 수 없습니다.");
        }
        return findDetail(postId);
    }

    // 작성자만 자신의 글 제목과 내용을 수정한다.
    @Transactional // 글 수정 전체를 하나의 트랜잭션으로 실행한다.
    public PostResponse updatePost(long postId, long authorId, UpdatePostRequest updatePostRequest) {
        CommunityPost communityPost = findOwnedPost(postId, authorId);
        communityPost.update(updatePostRequest.getTitle().strip(), updatePostRequest.getBody().strip());
        return toResponse(communityPost);
    }


    // 작성자만 자신의 글을 삭제한다.
    @Transactional // 글 삭제 전체를 하나의 트랜잭션으로 실행한다.
    public void deletePost(long postId, long authorId) {
        CommunityPost communityPost = findOwnedPost(postId, authorId);
        communityPostRepository.delete(communityPost);
    }



    // 로그인한 작성자를 확인하고 선택한 식당과 함께 지역 글을 저장한다.
    @Transactional // 글 생성 전체를 하나의 트랜잭션으로 실행한다.
    public PostResponse createPost(long authorId, CreatePostRequest request) {
        validateCoordinates(request.getLatitude(), request.getLongitude());
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> error(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."));
        Restaurant restaurant = null;
        if (request.getRestaurantId() != null) {
            restaurant = restaurantRepository.findById(request.getRestaurantId())
                    .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "음식점을 찾을 수 없습니다."));
        }
        Point areaLocation = new GeometryFactory(new PrecisionModel(), 4326)
                .createPoint(new Coordinate(request.getLongitude(), request.getLatitude()));
        CommunityPost communityPost = communityPostRepository.save(
                new CommunityPost(author, request.getTitle().strip(), request.getBody().strip(), areaLocation, restaurant));
        return toResponse(communityPost);
    }

    // 선택한 좌표의 3km 안에 작성된 최근 글을 반환한다.
    @Transactional(readOnly = true) // 주변 글 조회를 읽기 전용 트랜잭션으로 실행한다.
    public List<PostResponse> findNearby(double latitude, double longitude) {
        validateCoordinates(latitude, longitude);
        return communityPostRepository.findNearby(latitude, longitude).stream()
                .map(this::toResponse)
                .toList();
    }

    // 엔티티와 연관된 작성자·식당을 API 응답으로 변환한다.
    private PostResponse toResponse(CommunityPost communityPost) {
        Restaurant restaurant = communityPost.getRestaurant();

        return new PostResponse(
                communityPost.getId(),
                communityPost.getAuthor().getId(),
                communityPost.getAuthor().getDisplayName(),
                communityPost.getTitle(),
                communityPost.getBody(),
                restaurant == null ? null : restaurant.getId(),
                restaurant == null ? null : restaurant.getName(), communityPost.getCreatedAt(),
                communityPost.getViewCount(), postCommentRepository.countByPostId(communityPost.getId()));
    }

    // WGS84 위도·경도 범위를 벗어난 요청을 거부한다.
    private void validateCoordinates(double latitude, double longitude) {
        if (!Double.isFinite(latitude) || latitude < -90 || latitude > 90
                || !Double.isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw error(HttpStatus.BAD_REQUEST, "위도·경도가 유효하지 않습니다.");
        }
    }

    // 업무 오류를 일관된 ProblemDetail 응답으로 만든다.
    private ErrorResponseException error(HttpStatus status, String detail) {
        return new ErrorResponseException(status, ProblemDetail.forStatusAndDetail(status, detail), null);
    }


    // 글이 존재하고 로그인 사용자가 작성자인지 확인한다.
    private CommunityPost findOwnedPost(long postId, long authorId) {
        CommunityPost communityPost = communityPostRepository.findById(postId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "글을 찾을 수 없습니다."));

        if (!Objects.equals(communityPost.getAuthor().getId(), authorId)) {
            throw error(HttpStatus.FORBIDDEN, "내 글만 변경할 수 있습니다.");
        }

        return communityPost;
    }

}
