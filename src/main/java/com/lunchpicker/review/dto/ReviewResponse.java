package com.lunchpicker.review.dto;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long authorId;
    private String authorDisplayName;
    private int rating;
    private String body;
    private Instant createdAt;
    private Instant updatedAt;
}
