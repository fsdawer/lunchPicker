package com.lunchpicker.review.repository;

import com.lunchpicker.review.entity.Review;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    // 작성자와 함께 식당의 최신 리뷰 한 페이지를 조회한다.
    @Query("select review from Review review join fetch review.author where review.restaurant.id = :restaurantId order by review.createdAt desc, review.id desc")
    List<Review> findPage(@Param("restaurantId") long restaurantId, Pageable pageable);
}
