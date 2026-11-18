package com.lunchpicker.meetup.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.lunchpicker.auth.entity.User;
import com.lunchpicker.auth.repository.UserRepository;
import com.lunchpicker.chat.dto.SendMessageRequest;
import com.lunchpicker.chat.service.MeetupChatService;
import com.lunchpicker.meetup.dto.CreateMeetupRequest;
import com.lunchpicker.meetup.dto.MeetupResponse;
import com.lunchpicker.restaurant.entity.Restaurant;
import com.lunchpicker.restaurant.repository.RestaurantRepository;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.ErrorResponseException;

@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "RUN_DB_TESTS", matches = "true")
class MeetupFlowIntegrationTest {
    @Autowired MeetupService meetupService;
    @Autowired MeetupChatService meetupChatService;
    @Autowired UserRepository userRepository;
    @Autowired RestaurantRepository restaurantRepository;

    // 호스트를 첫 참여자로 저장하고 마지막 자리 이후의 참여를 거부한다.
    @Test
    void createsAndFillsMeetup() {
        User host = userRepository.save(new User("모집자", "host" + UUID.randomUUID(), "hash"));
        User guest = userRepository.save(new User("참여자", "guest" + UUID.randomUUID(), "hash"));
        User extra = userRepository.save(new User("추가", "extra" + UUID.randomUUID(), "hash"));
        Restaurant restaurant = restaurantRepository.save(new Restaurant("모집 검증 식당", point()));
        CreateMeetupRequest request = new CreateMeetupRequest();
        ReflectionTestUtils.setField(request, "restaurantId", restaurant.getId());
        ReflectionTestUtils.setField(request, "startsAt", Instant.now().plusSeconds(3600));
        ReflectionTestUtils.setField(request, "capacity", 2);

        MeetupResponse created = meetupService.create(host.getId(), request);
        MeetupResponse joined = meetupService.join(created.getId(), guest.getId());

        assertThat(created.getMemberCount()).isEqualTo(1);
        assertThat(joined.getMemberCount()).isEqualTo(2);
        assertThat(meetupService.findNearby(37.46282, 127.13917, guest.getId()))
                .anyMatch(meetup -> meetup.getId().equals(created.getId()) && meetup.isJoined());
        assertThat(meetupService.findMine(guest.getId()))
                .anyMatch(meetup -> meetup.getId().equals(created.getId()));
        assertThrows(ErrorResponseException.class, () -> meetupService.join(created.getId(), extra.getId()));
    }

    // 참여자는 메시지를 읽고 쓸 수 있지만 비참여자는 읽을 수 없다.
    @Test
    void limitsChatToMembers() {
        User host = userRepository.save(new User("모집자", "host" + UUID.randomUUID(), "hash"));
        User outsider = userRepository.save(new User("외부", "other" + UUID.randomUUID(), "hash"));
        Restaurant restaurant = restaurantRepository.save(new Restaurant("채팅 검증 식당", point()));
        CreateMeetupRequest meetupRequest = new CreateMeetupRequest();
        ReflectionTestUtils.setField(meetupRequest, "restaurantId", restaurant.getId());
        ReflectionTestUtils.setField(meetupRequest, "startsAt", Instant.now().plusSeconds(3600));
        ReflectionTestUtils.setField(meetupRequest, "capacity", 2);
        MeetupResponse meetup = meetupService.create(host.getId(), meetupRequest);
        SendMessageRequest messageRequest = new SendMessageRequest();
        ReflectionTestUtils.setField(messageRequest, "body", "점심에 만나요");

        meetupChatService.send(meetup.getId(), host.getId(), messageRequest);

        assertThat(meetupChatService.findMessages(meetup.getId(), host.getId(), 0))
                .extracting(message -> message.getBody()).containsExactly("점심에 만나요");
        assertThrows(ErrorResponseException.class,
                () -> meetupChatService.findMessages(meetup.getId(), outsider.getId(), 0));
    }

    // 남위례역 WGS84 좌표로 테스트 식당 위치를 만든다.
    private Point point() {
        Point point = new GeometryFactory().createPoint(new Coordinate(127.13917, 37.46282));
        point.setSRID(4326);
        return point;
    }
}
