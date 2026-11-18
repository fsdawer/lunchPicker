package com.lunchpicker.meetup.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.lunchpicker.meetup.entity.MealMeetup;
import com.lunchpicker.meetup.repository.MealMeetupRepository;
import com.lunchpicker.restaurant.repository.RestaurantRepository;
import com.lunchpicker.auth.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.ErrorResponseException;

class MeetupServiceTest {
    private final MealMeetupRepository mealMeetupRepository = mock(MealMeetupRepository.class);
    private final MeetupService meetupService = new MeetupService(mealMeetupRepository,
            mock(RestaurantRepository.class), mock(UserRepository.class));

    // 마지막 자리가 찬 모집에는 추가 사용자가 참여할 수 없다.
    @Test
    void rejectsJoiningFullMeetup() {
        MealMeetup mealMeetup = new MealMeetup(1L, 2L, Instant.now().plusSeconds(3600), 2);
        when(mealMeetupRepository.findLocked(10L)).thenReturn(Optional.of(mealMeetup));
        when(mealMeetupRepository.isMember(10L, 3L)).thenReturn(false);
        when(mealMeetupRepository.countMembers(10L)).thenReturn(2);

        ErrorResponseException error = assertThrows(ErrorResponseException.class,
                () -> meetupService.join(10L, 3L));
        assertEquals(409, error.getStatusCode().value());
    }
}
