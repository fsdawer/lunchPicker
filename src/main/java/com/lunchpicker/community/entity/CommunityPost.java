package com.lunchpicker.community.entity;

import com.lunchpicker.auth.entity.User;
import com.lunchpicker.restaurant.entity.Restaurant;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.locationtech.jts.geom.Point;

@Entity // 이 클래스를 JPA가 DB 테이블에 저장할 엔티티로 관리한다.
@Table(name = "community_posts", schema = "lunchpicker") // 실제 테이블 이름과 스키마를 지정한다.
@Getter // 모든 필드의 읽기 메서드를 Lombok이 만든다.
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA가 엔티티를 생성할 때 사용할 기본 생성자를 만든다.
public class CommunityPost {
    @Id // 글을 구분하는 기본키 필드다.
    @GeneratedValue(strategy = GenerationType.IDENTITY) // 기본키 값을 DB가 생성한다.
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false) // 여러 글이 한 작성자를 참조한다.
    @JoinColumn(name = "author_id") // 작성자 FK의 DB 컬럼명을 지정한다.
    private User author;

    @Column(nullable = false, length = 100) // 목록과 상세에서 사용할 제목이다.
    private String title;

    @Column(nullable = false, columnDefinition = "text") // 글 내용은 비어 있을 수 없다.
    private String body;

    @JdbcTypeCode(SqlTypes.GEOGRAPHY) // PostGIS geography 타입으로 저장한다.
    @Column(nullable = false, columnDefinition = "geography(Point,4326)") // WGS84 지역 좌표 컬럼이다.
    private Point areaLocation;

    @ManyToOne(fetch = FetchType.LAZY) // 선택한 식당을 필요할 때 조회한다.
    @JoinColumn(name = "restaurant_id") // 연결된 식당의 FK 컬럼명을 지정한다.
    private Restaurant restaurant;

    @Column(nullable = false, updatable = false) // 작성 시각은 이후 수정하지 않는다.
    private Instant createdAt;

    @Column(name = "view_count", nullable = false) // 상세 화면을 연 횟수를 저장한다.
    private long viewCount;


    // 작성자, 지역 좌표, 선택한 식당으로 글을 만든다.
    public CommunityPost(User author, String title, String body, Point areaLocation, Restaurant restaurant) {
        this.author = author;
        this.title = title;
        this.body = body;
        this.areaLocation = areaLocation;
        this.restaurant = restaurant;
        this.createdAt = Instant.now();
    }

    // 글의 제목과 내용을 함께 변경한다.
    public void update(String title, String body) {
        this.title = title;
        this.body = body;
    }
}
