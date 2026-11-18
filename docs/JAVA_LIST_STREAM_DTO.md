# Java `List`, `stream`, `map`과 DTO 변환

## 예제 코드

```java
public List<MenuResponse> findByRestaurantId(Long restaurantId) {
    return menuRepository.findByRestaurantIdOrderByIdAsc(restaurantId)
            .stream()
            .map(menu -> new MenuResponse(
                    menu.getId(),
                    menu.getName(),
                    menu.getPriceKrw()))
            .toList();
}
```

이 메서드는 **식당의 메뉴를 DB에서 조회한 뒤, 각 메뉴를 API 응답용 객체로 바꿔 목록으로 반환**한다.

## 1. `List<MenuResponse>`: 목록에 들어갈 타입 지정

`List`는 여러 값을 담는 자료형이다. 꺾쇠 안의 `MenuResponse`는 **목록의 각 요소가 어떤 타입인지** 지정한다. 이를 제네릭이라고 한다.

```java
List<Menu> menus;                  // Menu 객체가 들어 있는 목록
List<MenuResponse> menuResponses;  // MenuResponse 객체가 들어 있는 목록
```

따라서 메서드 선언의 `List<MenuResponse>`는 “이 메서드가 `MenuResponse` 목록을 반환한다”는 뜻이다. Repository의 조회 결과는 `List<Menu>`이고, 메서드의 최종 반환값은 `List<MenuResponse>`다.

## 2. `stream()`: 목록을 처리할 흐름 만들기

```java
menuRepository.findByRestaurantIdOrderByIdAsc(restaurantId).stream()
```

Repository 메서드는 해당 식당의 메뉴를 ID 오름차순으로 조회해 `List<Menu>`를 반환한다. `.stream()`은 이 목록의 요소를 순서대로 변환할 수 있는 `Stream<Menu>`를 만든다.

`stream()`을 호출한 순간 변환이 끝나는 것은 아니다. 뒤의 `map()`으로 변환 방법을 정하고, 마지막 `toList()`에서 결과를 모은다.

## 3. `map()`: 요소 하나를 다른 요소 하나로 변환

```java
.map(menu -> new MenuResponse(
        menu.getId(),
        menu.getName(),
        menu.getPriceKrw()))
```

`menu -> ...`는 람다식이다. 왼쪽의 `menu`는 목록에서 꺼낸 **Menu 객체 하나**이고, 오른쪽은 그 객체를 받아 만드는 **MenuResponse 객체 하나**다.

메뉴가 3개라면 변환도 3번 실행되어 `MenuResponse` 3개가 만들어진다. `map()` 전의 흐름은 `Stream<Menu>`, 후의 흐름은 `Stream<MenuResponse>`다.

## 4. `toList()`: 변환 결과를 목록으로 모으기

```java
.toList();
```

변환된 `MenuResponse`들을 `List<MenuResponse>`로 모아 반환한다. 조회된 메뉴가 없다면 빈 목록이 반환되고, API의 JSON 응답은 `[]`가 된다.

```text
DB 조회 → List<Menu> → stream() → map() → Stream<MenuResponse> → toList() → List<MenuResponse>
```

## 5. 왜 `new MenuResponse(...)`를 만들까?

| 구분 | `Menu` Entity | `MenuResponse` DTO |
| --- | --- | --- |
| 역할 | DB의 `menus` 테이블과 연결 | API로 보낼 데이터 표현 |
| 포함 정보 | ID, 식당 ID, 메뉴명, 가격 등 | 현재 응답에 필요한 ID, 메뉴명, 가격 |

Entity를 그대로 응답하지 않고 DTO로 바꾸면 **클라이언트에 보여줄 필드만 선택**할 수 있다. 메뉴마다 값이 다르므로 각 메뉴에 대응하는 응답 객체를 하나씩 만든다.

여기서 `new`는 자바 메모리에 객체를 만드는 것이다. **DB에 새 메뉴를 INSERT하거나 저장하는 동작이 아니다.** 이 코드에는 `save()` 호출이 없다.

## 같은 코드를 `for`문으로 쓰면

```java
List<Menu> menus = menuRepository.findByRestaurantIdOrderByIdAsc(restaurantId);
List<MenuResponse> responses = new ArrayList<>();

for (Menu menu : menus) {
    responses.add(new MenuResponse(
            menu.getId(),
            menu.getName(),
            menu.getPriceKrw()));
}

return responses;
```

`stream().map(...).toList()`는 위 반복문에서 하는 **각 요소 변환과 결과 수집**을 이어서 표현한 것이다.
