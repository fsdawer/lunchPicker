package com.lunchpicker.chat.repository;

import com.lunchpicker.chat.entity.ChatMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    // 모집에서 주어진 메시지 ID 이후의 메시지를 최대 100개 읽는다.
    @Query(value = """
            SELECT * FROM lunchpicker.meetup_messages
            WHERE meetup_id = :meetupId AND id > :afterId
            ORDER BY id LIMIT 100
            """, nativeQuery = true)
    List<ChatMessage> findNewer(@Param("meetupId") Long meetupId, @Param("afterId") Long afterId);
}
