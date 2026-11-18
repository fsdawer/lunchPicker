package com.lunchpicker.restaurant.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.lunchpicker.menu.repository.MenuRepository;
import com.lunchpicker.restaurant.dto.RestaurantMapPoint;
import com.lunchpicker.restaurant.repository.RestaurantRepository;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class RestaurantServiceTest {
    private final RestaurantRepository repository = mock(RestaurantRepository.class);
    private final RestaurantService service = new RestaurantService(repository, mock(MenuRepository.class));

    // 501곳이 조회되면 500곳만 반환하고 잘림 여부를 표시한다.
    @Test
    void marksTruncatedMapResults() {
        var points = IntStream.range(0, 501)
                .mapToObj(index -> new RestaurantMapPoint((long) index, "식당 " + index, 37.4, 127.1))
                .toList();
        when(repository.findInBounds(37.4, 37.5, 127.1, 127.2, 37.47, 127.14)).thenReturn(points);

        var result = service.findMap(37.4, 37.5, 127.1, 127.2, 37.47, 127.14);

        assertThat(result.isTruncated()).isTrue();
        assertThat(result.getRestaurants()).hasSize(500);
    }
}
