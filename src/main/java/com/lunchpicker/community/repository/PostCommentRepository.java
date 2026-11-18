package com.lunchpicker.community.repository;

import com.lunchpicker.community.entity.PostComment;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostCommentRepository extends JpaRepository<PostComment, Long> {
    // 해당 글의 댓글 수를 센다.
    long countByPostId(Long postId);

    // 작성자와 함께 최신 댓글 한 페이지를 조회한다.
    @Query("SELECT comment FROM PostComment comment JOIN FETCH comment.author WHERE comment.postId = :postId ORDER BY comment.createdAt DESC, comment.id DESC")
    List<PostComment> findPage(@Param("postId") Long postId, Pageable pageable);
}
