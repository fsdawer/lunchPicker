package com.lunchpicker.chat.service;

import com.lunchpicker.auth.entity.User;
import com.lunchpicker.auth.repository.UserRepository;
import com.lunchpicker.chat.dto.ChatMessageResponse;
import com.lunchpicker.chat.dto.SendMessageRequest;
import com.lunchpicker.chat.entity.ChatMessage;
import com.lunchpicker.chat.repository.ChatMessageRepository;
import com.lunchpicker.meetup.repository.MealMeetupRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.ErrorResponseException;

@Service
@RequiredArgsConstructor // final 의존성을 받는 생성자를 Lombok이 만든다.
public class MeetupChatService {
    private final ChatMessageRepository chatMessageRepository;
    private final MealMeetupRepository mealMeetupRepository;
    private final UserRepository userRepository;

    // 참여자 권한을 확인하고 마지막으로 읽은 ID 이후 메시지를 반환한다.
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> findMessages(long meetupId, long userId, long afterId) {
        if (afterId < 0) throw error(HttpStatus.BAD_REQUEST, "메시지 시작 ID가 유효하지 않습니다.");
        checkMember(meetupId, userId);
        return chatMessageRepository.findNewer(meetupId, afterId).stream().map(this::toResponse).toList();
    }

    // 참여자 권한을 확인하고 새 메시지를 저장한다.
    @Transactional
    public ChatMessageResponse send(long meetupId, long userId, SendMessageRequest request) {
        checkMember(meetupId, userId);
        ChatMessage chatMessage = chatMessageRepository.save(
                new ChatMessage(meetupId, userId, request.getBody().strip()));
        return toResponse(chatMessage);
    }

    // 모집이 존재하고 사용자가 참여 중인지 확인한다.
    private void checkMember(long meetupId, long userId) {
        if (!mealMeetupRepository.existsById(meetupId)) throw error(HttpStatus.NOT_FOUND, "모집을 찾을 수 없습니다.");
        if (!mealMeetupRepository.isMember(meetupId, userId)) throw error(HttpStatus.FORBIDDEN, "참여자만 채팅할 수 있습니다.");
    }

    // 메시지에 작성자 표시 이름을 더해 API 응답으로 만든다.
    private ChatMessageResponse toResponse(ChatMessage chatMessage) {
        User sender = userRepository.findById(chatMessage.getSenderId())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "작성자를 찾을 수 없습니다."));
        return new ChatMessageResponse(chatMessage.getId(), sender.getId(), sender.getDisplayName(),
                chatMessage.getBody(), chatMessage.getCreatedAt());
    }

    // 상태와 설명을 ProblemDetail HTTP 오류로 만든다.
    private ErrorResponseException error(HttpStatus status, String detail) {
        return new ErrorResponseException(status, ProblemDetail.forStatusAndDetail(status, detail), null);
    }
}
