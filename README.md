# 오늘의 점심 저녁 메뉴는?

회사 근처 직장인들이 함께 메뉴를 고르고, 주변 음식점을 발견하고 리뷰하며, 돌림판으로 식사 장소를 정하는 서비스입니다.

백엔드는 Java 17 / Spring Boot / Spring Data JPA, 모바일 앱은 React Native / Expo를 사용합니다. 의존성 설치와 실행 방법은 [모바일 앱 안내](apps/mobile/README.md), 제품 구상과 기능 범위는 [프로젝트 기획서](docs/PROJECT_PLAN.md)를 참고하세요.

구현 기준은 루트 [공통·백엔드 규칙](AGENTS.md)과 [모바일 앱 규칙](apps/mobile/AGENTS.md)에 기록했습니다. 테이블과 관계는 [데이터베이스 구조](docs/DATABASE_DESIGN.md)를 참고하세요.

## 데이터베이스 실행

### Docker Compose (권장)

[Docker Desktop](https://docs.docker.com/desktop/setup/install/mac-install/)을 실행하고, 터미널에서 아래 명령을 실행합니다. `DB_PASSWORD`는 본인이 정한 로컬 개발용 비밀번호로 바꿉니다. 비밀번호를 저장소 파일에 넣지 마세요.

```sh
export DB_PASSWORD='직접_정한_비밀번호'
docker compose up -d --wait db
DB_URL=jdbc:postgresql://localhost:5433/postgres DB_USER=lunchpicker ./gradlew bootRun
```

컨테이너는 호스트 포트 **5433**을 사용해 기존 PostgreSQL 16(5432)과 분리됩니다. 데이터는 Docker 볼륨에 보관되며 `docker compose down` 후에도 유지됩니다. 앱을 실행하면 Flyway가 Docker DB의 `lunchpicker` 스키마에 V1~V4를 적용하고 공공데이터 음식점을 적재합니다. 컨테이너는 `postgis/postgis:16-3.7`의 amd64 이미지를 사용하므로 Apple Silicon에서는 에뮬레이션으로 동작합니다.

이 컴퓨터의 IntelliJ에는 `LunchPicker (Docker DB)` 로컬 실행 설정을 추가했습니다. Docker DB가 실행 중이면 해당 설정을 선택해 실행 버튼으로 백엔드를 시작할 수 있습니다. 실행 설정은 `.idea/` 아래에 있어 Git에 포함되지 않습니다.

확인 명령:

```sh
docker compose ps
docker compose exec db psql -U lunchpicker -d postgres -c 'SELECT PostGIS_Version();'
docker compose exec db psql -U lunchpicker -d postgres -c '\dt lunchpicker.*'
```

IntelliJ Database 창에서 Docker DB를 보려면 데이터 소스를 `Host=localhost`, `Port=5433`, `Database=postgres`, `User=lunchpicker`로 연결하고 `lunchpicker` 스키마를 표시 대상으로 선택한 뒤 새로고침하세요. `Port=5432`의 기존 로컬 DB는 별개이며, 그 DB의 `lunchpicker` 스키마에는 Docker 테이블이 나타나지 않습니다.

JPA 저장과 PostGIS 반경 검색 통합 테스트는 Docker DB가 켜진 상태에서 실행합니다.

```sh
RUN_DB_TESTS=true DB_URL=jdbc:postgresql://localhost:5433/postgres DB_USER=lunchpicker ./gradlew test
```

`DB_PASSWORD`도 같은 터미널에 설정되어 있어야 합니다.

### 기존 Homebrew PostgreSQL 16 사용

현재 로컬 `postgres` 데이터베이스에는 `lunchpicker` 스키마가 있지만 PostGIS 확장 파일이 없습니다. PostgreSQL **16 서버에 맞는** PostGIS를 설치한 뒤 `./gradlew bootRun`을 실행하면 Flyway가 확장과 테이블을 생성합니다. 현재 Homebrew의 `postgis` 수식은 PostgreSQL 17·18용으로 빌드되므로, `brew install postgis`만으로 기존 PostgreSQL 16에 확장이 생긴다고 가정하면 안 됩니다. PostgreSQL을 올릴 경우에는 기존 DB를 덤프하고 새 서버에 복원해야 합니다.

기본 접속 주소는 Docker PostGIS의 `jdbc:postgresql://localhost:5433/postgres`, 기본 사용자는 `lunchpicker`입니다. `DB_URL`, `DB_USER`, `DB_PASSWORD`로 변경할 수 있습니다. Docker DB와 기존 로컬 DB는 데이터가 서로 공유되지 않습니다.

주변 음식점 조회: `GET /api/v1/restaurants?latitude=37.46282&longitude=127.13917&radiusMeters=3000&offset=0`. 좌표는 WGS84 위도·경도, 반경과 반환 거리는 미터입니다. 기본 반경은 3 km, 허용 반경은 1~5000 m이며 한 번에 200개씩 반환합니다. `offset=200`, `offset=400`으로 다음 목록을 조회합니다. 기본순은 거리순이며 `sort=favorites`는 찜 수, `sort=popular`는 최근 30일 식당 상세 조회수 내림차순입니다. 동률은 거리와 ID 순으로 정렬합니다. 이름을 검색하려면 `q=국밥`을 추가합니다. 검색어는 최대 50자이며 `%`와 `_`도 일반 문자로 처리합니다. `minPriceKrw=10000&maxPriceKrw=20000`을 추가하면 해당 가격대의 메뉴가 하나 이상 등록된 식당만 반환합니다. 둘 다 0이면 가격 필터가 꺼지며 금액은 0~100,000원입니다. 가격 정보가 없는 식당은 가격 필터 결과에서 제외됩니다. 현재 공공데이터에는 메뉴 가격이 없어 가격대 결과가 비어 있을 수 있습니다.

식당 상세: `GET /api/v1/restaurants/{id}`. 주소·업종·좌표·공공데이터 기준일과 등록된 메뉴를 반환하며, 없는 ID는 404입니다. 지도 마커: `GET /api/v1/restaurants/map?south=37.45&north=37.48&west=127.12&east=127.15&latitude=37.46282&longitude=127.13917`. WGS84 지도 경계와 지정한 중심점 3 km 안의 식당을 조회합니다. 지도 경계의 위도·경도 범위는 각 0.12도 이하로 제한하고 최대 500곳과 `truncated` 여부를 반환합니다.

앱은 식당 상세에 들어갈 때 `POST /api/v1/restaurants/{id}/views`로 조회를 기록합니다. 로그인 사용자는 `GET /api/v1/restaurants/{id}/favorite`으로 찜 여부를 확인하고, 같은 경로의 `POST`·`DELETE`로 찜하거나 해제합니다. 찜 요청에는 `Authorization: Bearer <로그인 토큰>`이 필요합니다.

## 초기 음식점 데이터

[소상공인시장진흥공단 상가(상권)정보](https://www.data.go.kr/data/15083033/fileData.do)의 **2026-09-30** 공개 CSV에서 서울·경기 소재 식사 업소를 골랐습니다. 두 역 중 하나의 반경 3 km 안에 있는 업소 **7,120개**가 V4 마이그레이션으로 Docker DB에 적재되었습니다. 카페·주점·제과점·구내식당은 초기 목록에서 제외했습니다. 원본의 업종 분류와 영업 상태는 실제와 다를 수 있습니다.

원본 ZIP은 저장소에 포함하지 않았습니다. [생성 스크립트](scripts/generate_public_restaurant_seed.py)는 ZIP을 읽어 위치·업종 후보를 추린 뒤 PostGIS의 3 km 조건으로 거르는 SQL을 생성합니다. 현재 V4는 생성 결과를 포함하므로 새 DB에서도 같은 초기 데이터를 재현할 수 있습니다.

### 커뮤니티 API

`GET /api/v1/community/posts?latitude=37.49306&longitude=127.11806`은 해당 좌표 3 km 안의 최근 글 최대 20개를 반환합니다. `POST /api/v1/community/posts`는 로그인 토큰이 필요하며, 본문 예시는 아래와 같습니다. `restaurantId`를 생략하거나 `null`로 보내면 식당 없이 글을 작성합니다.

```json
{"title":"오늘 점심 같이 먹어요","body":"오늘 점심은 가락동에서 먹어요.","latitude":37.49306,"longitude":127.11806,"restaurantId":null}
```

작성 요청에는 `Authorization: Bearer <로그인 토큰>` 헤더를 보냅니다. 작성자 ID는 요청 본문이 아니라 로그인 토큰에서 결정합니다. 위치는 WGS84 위도·경도이며 반경 단위는 미터입니다.

지역 글의 제목은 필수이며 최대 100자입니다. 기존 글의 제목은 이전 본문 첫 줄로 채웁니다. 상세 `GET /api/v1/community/posts/{postId}`는 공개 조회합니다. 제목·본문 수정 `PUT /api/v1/community/posts/{postId}`의 요청은 `{"title":"수정한 제목","body":"수정한 글"}`이며, 삭제 `DELETE /api/v1/community/posts/{postId}`는 성공하면 204를 반환합니다. 수정·삭제는 로그인한 작성자만 가능하고 다른 사용자는 403입니다.

커뮤니티 목록과 상세에는 조회수·댓글 수를 표시합니다. 앱이 상세 화면을 열면 `POST /api/v1/community/posts/{postId}/views`로 조회수를 한 번 증가시킵니다. 댓글은 `GET /api/v1/community/posts/{postId}/comments?page=0`으로 최신 20개씩 조회하고, 로그인 사용자는 같은 경로에 `{"body":"같이 가요"}`를 POST해 작성합니다. 작성자만 `DELETE /api/v1/community/posts/{postId}/comments/{commentId}`로 자신의 댓글을 삭제할 수 있습니다. 글을 삭제하면 해당 댓글도 함께 삭제됩니다.

### 같이 먹기 모집·채팅 API

`GET /api/v1/meetups?latitude=37.46282&longitude=127.13917`은 중심점 3 km 안의 예정 모집을 반환합니다. `POST /api/v1/meetups`는 로그인 토큰과 `{"restaurantId":1,"startsAt":"2026-11-16T03:00:00Z","capacity":4}`를 받습니다. 식사 시간은 앞으로 30일 이내, 정원은 2~8명입니다. 모집 작성자는 자동으로 참여합니다. `POST /api/v1/meetups/{meetupId}/join`으로 참여하고 `DELETE /api/v1/meetups/{meetupId}/join`으로 취소합니다. 모집 행을 잠근 상태에서 정원을 검사해 동시 신청으로 정원을 초과하지 않도록 합니다. 작성자는 참여를 취소할 수 없습니다.

`GET /api/v1/meetups/mine`은 내가 참여한 모집 중 식사 시작 후 24시간이 지나지 않은 채팅방을 반환합니다. 참여자 채팅은 `GET /api/v1/meetups/{meetupId}/messages?afterId=0`으로 새 메시지를 읽고 `POST /api/v1/meetups/{meetupId}/messages`에 `{"body":"곧 도착해요"}`를 보내는 방식입니다. 모집 참여자만 읽고 쓸 수 있습니다. 앱은 채팅방이 열린 동안 5초마다 새 메시지를 확인합니다.

### 식당 리뷰 API

`GET /api/v1/restaurants/{restaurantId}/reviews?page=0`은 최신 리뷰 20개를 공개 조회합니다. `POST /api/v1/restaurants/{restaurantId}/reviews`와 `PUT /api/v1/restaurants/{restaurantId}/reviews/{reviewId}`의 본문은 `{"rating":5,"body":"방문 후기"}`입니다. 작성·수정·삭제 요청에는 `Authorization: Bearer <로그인 토큰>` 헤더가 필요합니다. `DELETE /api/v1/restaurants/{restaurantId}/reviews/{reviewId}`는 작성자만 실행할 수 있으며 성공하면 204를 반환합니다. 평점은 1~5점, 본문은 공백이 아닌 1~1000자입니다.
