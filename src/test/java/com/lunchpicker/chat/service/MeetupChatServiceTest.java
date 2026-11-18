package com.lunchpicker.chat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.lunchpicker.auth.repository.UserRepository;
import com.lunchpicker.chat.repository.ChatMessageRepository;
import com.lunchpicker.meetup.repository.MealMeetupRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.ErrorResponseException;

class MeetupChatServiceTest {
    private final MealMeetupRepository mealMeetupRepository = mock(MealMeetupRepository.class);
    private final MeetupChatService meetupChatService = new MeetupChatService(
            mock(ChatMessageRepository.class), mealMeetupRepository, mock(UserRepository.class));

    // 모집에 참여하지 않은 사용자는 메시지를 읽을 수 없다.
    @Test
    void rejectsReadingByNonMember() {
        when(mealMeetupRepository.existsById(5L)).thenReturn(true);
        when(mealMeetupRepository.isMember(5L, 7L)).thenReturn(false);

        ErrorResponseException error = assertThrows(ErrorResponseException.class,
                () -> meetupChatService.findMessages(5L, 7L, 0L));
        assertEquals(403, error.getStatusCode().value());
    }
}
