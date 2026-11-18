package com.lunchpicker.chat.controller;

import com.lunchpicker.auth.service.AuthService;
import com.lunchpicker.chat.dto.ChatMessageResponse;
import com.lunchpicker.chat.dto.SendMessageRequest;
import com.lunchpicker.chat.service.MeetupChatService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/meetups/{meetupId}/messages")
@RequiredArgsConstructor // final 의존성을 받는 생성자를 Lombok이 만든다.
public class MeetupChatController {
    private final MeetupChatService meetupChatService;
    private final AuthService authService;

    // 참여자의 마지막 메시지 ID 이후 메시지를 조회한다.
    @GetMapping
    public List<ChatMessageResponse> list(@PathVariable long meetupId,
                                          @RequestParam(defaultValue = "0") long afterId,
                                          @RequestHeader(value = "Authorization", required = false) String authorization) {
        validateId(meetupId);
        return meetupChatService.findMessages(meetupId, userId(authorization), afterId);
    }

    // 참여자의 새 메시지를 저장한다.
    @PostMapping
    public ResponseEntity<ChatMessageResponse> send(@PathVariable long meetupId,
                                                     @RequestHeader(value = "Authorization", required = false) String authorization,
                                                     @Valid @RequestBody SendMessageRequest request) {
        validateId(meetupId);
        return ResponseEntity.status(HttpStatus.CREATED).body(meetupChatService.send(meetupId, userId(authorization), request));
    }

    // 로그인 토큰에서 서버가 확인한 사용자 ID를 얻는다.
    private long userId(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ") || authorization.length() <= 7) {
            throw new ErrorResponseException(HttpStatus.UNAUTHORIZED,
                    ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."), null);
        }
        return authService.me(authorization.substring(7)).getId();
    }

    // 모집 ID가 양수인지 확인한다.
    private void validateId(long meetupId) {
        if (meetupId < 1) {
            throw new ErrorResponseException(HttpStatus.BAD_REQUEST,
                    ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "모집 ID가 유효하지 않습니다."), null);
        }
    }
}
