package com.lunchpicker.community.repository;

import com.lunchpicker.community.entity.CommunityPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, Long> {
    // 상세 화면 진입 시 조회수를 DB에서 원자적으로 1 증가시킨다.
    @Modifying(flushAutomatically = true, clearAutomatically = true) // 직접 SQL로 바꾼 조회수를 JPA가 새로 읽도록 한다.
    @Query(value = "UPDATE lunchpicker.community_posts SET view_count = view_count + 1 WHERE id = :postId", nativeQuery = true)
    int incrementViewCount(@Param("postId") long postId);

    // 입력 좌표 3km 안의 최근 글 최대 20개를 조회한다.
    @Query(value = """
            SELECT post.*
            FROM lunchpicker.community_posts post
            WHERE public.ST_DWithin(
                post.area_location,
                CAST(
                    public.ST_SetSRID(
                        public.ST_MakePoint(:longitude, :latitude), 4326
                    ) AS public.geography
                ),
                3000
            )
            ORDER BY post.created_at DESC, post.id DESC
            LIMIT 20
            """, nativeQuery = true)
    List<CommunityPost> findNearby(
            @Param("latitude") double latitude,
            @Param("longitude") double longitude
    );
}
