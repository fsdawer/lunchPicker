package com.lunchpicker.community.entity;

import com.lunchpicker.auth.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity // 댓글을 JPA 영속 엔티티로 관리한다.
@Table(name = "post_comments", schema = "lunchpicker") // 댓글 테이블을 지정한다.
@Getter // 필드의 읽기 메서드를 Lombok이 만든다.
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA가 사용할 기본 생성자를 만든다.
public class PostComment {
    @Id // 댓글의 기본키다.
    @GeneratedValue(strategy = GenerationType.IDENTITY) // 기본키 값을 DB가 생성한다.
    private Long id;

    @Column(name = "post_id", nullable = false) // 댓글이 달린 글의 ID다.
    private Long postId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false) // 여러 댓글이 한 작성자를 참조한다.
    @JoinColumn(name = "author_id") // 작성자 FK 컬럼을 지정한다.
    private User author;

    @Column(nullable = false, columnDefinition = "text") // 댓글 내용은 비어 있을 수 없다.
    private String body;

    @Column(nullable = false, updatable = false) // 작성 시각은 수정하지 않는다.
    private Instant createdAt;

    // 글, 작성자, 내용으로 새 댓글을 만든다.
    public PostComment(Long postId, User author, String body) {
        this.postId = postId;
        this.author = author;
        this.body = body;
        this.createdAt = Instant.now();
    }
}
