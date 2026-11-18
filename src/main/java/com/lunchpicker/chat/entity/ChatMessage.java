package com.lunchpicker.chat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "meetup_messages", schema = "lunchpicker")
@Getter // 메시지 필드의 읽기 메서드를 Lombok이 만든다.
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA가 사용할 기본 생성자를 만든다.
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "meetup_id", nullable = false)
    private Long meetupId;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(nullable = false, columnDefinition = "text")
    private String body;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // 모집 ID, 작성자 ID, 내용을 저장할 메시지를 만든다.
    public ChatMessage(Long meetupId, Long senderId, String body) {
        this.meetupId = meetupId;
        this.senderId = senderId;
        this.body = body;
        this.createdAt = Instant.now();
    }
}
