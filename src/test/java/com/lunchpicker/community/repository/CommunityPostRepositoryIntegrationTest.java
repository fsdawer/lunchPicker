package com.lunchpicker.community.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.lunchpicker.auth.entity.User;
import com.lunchpicker.auth.repository.UserRepository;
import com.lunchpicker.community.entity.CommunityPost;
import com.lunchpicker.community.dto.UpdatePostRequest;
import com.lunchpicker.community.dto.PostCommentRequest;
import com.lunchpicker.community.service.CommunityPostService;
import com.lunchpicker.community.service.PostCommentService;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "RUN_DB_TESTS", matches = "true")
class CommunityPostRepositoryIntegrationTest {
    @Autowired CommunityPostRepository communityPostRepository;
    @Autowired UserRepository userRepository;
    @Autowired CommunityPostService communityPostService;
    @Autowired PostCommentService postCommentService;
    @Autowired EntityManager entityManager;

    // PostGIS가 3km 안쪽 글만 포함하고 바깥쪽 글은 제외하는지 확인한다.
    @Test
    void findsOnlyPostsWithinThreeKilometers() {
        User author = userRepository.save(new User("작성자", "post_" + UUID.randomUUID().toString().substring(0, 12), "hash"));
        CommunityPost inside = communityPostRepository.save(new CommunityPost(author, "안쪽 제목", "안쪽", point(127.11806, 37.49306), null));
        CommunityPost outside = communityPostRepository.save(new CommunityPost(author, "바깥 제목", "바깥쪽", point(127.11806, 37.54306), null));
        communityPostRepository.flush();

        List<Long> ids = communityPostRepository.findNearby(37.49306, 127.11806).stream()
                .map(CommunityPost::getId).toList();

        assertThat(ids).contains(inside.getId()).doesNotContain(outside.getId());
    }

    // 수정한 글은 DB에 저장되고 삭제한 글은 다시 조회되지 않는다.
    @Test
    void updatesAndDeletesOwnedPost() {
        User author = userRepository.save(new User("작성자", "post_" + UUID.randomUUID().toString().substring(0, 12), "hash"));
        CommunityPost communityPost = communityPostRepository.save(new CommunityPost(author, "원제목", "원문", point(127.11806, 37.49306), null));
        UpdatePostRequest request = new UpdatePostRequest();
        ReflectionTestUtils.setField(request, "title", "  수정 제목  ");
        ReflectionTestUtils.setField(request, "body", "  수정한 글  ");

        communityPostService.updatePost(communityPost.getId(), author.getId(), request);
        entityManager.flush();
        entityManager.clear();
        assertThat(communityPostRepository.findById(communityPost.getId()).orElseThrow().getBody()).isEqualTo("수정한 글");
        assertThat(communityPostRepository.findById(communityPost.getId()).orElseThrow().getTitle()).isEqualTo("수정 제목");

        communityPostService.deletePost(communityPost.getId(), author.getId());
        entityManager.flush();
        entityManager.clear();
        assertThat(communityPostRepository.findById(communityPost.getId())).isEmpty();
    }

    // 댓글 작성·삭제가 목록의 댓글 수와 상세 댓글 조회에 반영된다.
    @Test
    void createsAndDeletesComment() {
        User author = userRepository.save(new User("작성자", "post_" + UUID.randomUUID().toString().substring(0, 12), "hash"));
        CommunityPost communityPost = communityPostRepository.save(new CommunityPost(author, "점심 이야기", "오늘 점심 이야기", point(127.11806, 37.49306), null));
        PostCommentRequest request = new PostCommentRequest();
        ReflectionTestUtils.setField(request, "body", "  같이 가요  ");

        Long commentId = postCommentService.create(communityPost.getId(), author.getId(), request).getId();

        assertThat(communityPostService.findDetail(communityPost.getId()).getCommentCount()).isEqualTo(1);
        assertThat(postCommentService.findPage(communityPost.getId(), 0))
                .extracting(comment -> comment.getBody()).containsExactly("같이 가요");

        postCommentService.delete(communityPost.getId(), commentId, author.getId());
        entityManager.flush();
        assertThat(communityPostService.findDetail(communityPost.getId()).getCommentCount()).isZero();
    }

    // 상세 화면 진입만 조회수를 올리고 일반 GET 조회는 올리지 않는다.
    @Test
    void countsDetailViewOnce() {
        User author = userRepository.save(new User("작성자", "post_" + UUID.randomUUID().toString().substring(0, 12), "hash"));
        CommunityPost communityPost = communityPostRepository.save(new CommunityPost(author, "점심 이야기", "오늘 점심 이야기", point(127.11806, 37.49306), null));

        assertThat(communityPostService.findDetail(communityPost.getId()).getViewCount()).isZero();
        assertThat(communityPostService.recordView(communityPost.getId()).getViewCount()).isEqualTo(1);
        assertThat(communityPostService.findDetail(communityPost.getId()).getViewCount()).isEqualTo(1);
    }

    // 경도·위도 순서의 SRID 4326 지점을 만든다.
    private Point point(double longitude, double latitude) {
        return new GeometryFactory(new PrecisionModel(), 4326).createPoint(new Coordinate(longitude, latitude));
    }
}
