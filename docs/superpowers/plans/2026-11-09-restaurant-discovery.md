# 음식점 탐색 구현 계획

> **For agentic workers:** 구현 시 `executing-plans` 절차로 각 단계를 완료하고 검증한다. 체크박스는 진행 상태를 기록한다.

**Goal:** 남위례역·가락시장역 중심 3 km 안에서 음식점을 검색하고, 상세 정보를 확인하고, 지도에서 위치를 볼 수 있게 한다.

**Architecture:** 기존 Spring Data JPA + PostGIS 반경 조회를 확장한다. 검색은 기존 목록 API의 선택적 이름 조건으로 제공하고, 상세는 식당 ID로 조회한다. Expo Router는 탭과 검색·상세 화면을 분리하고, 지도는 화면 범위에 필요한 위치만 별도 API로 가져온다.

**Tech Stack:** Java 17, Spring Boot, Spring Data JPA, PostgreSQL/PostGIS, React Native/Expo Router, TypeScript.

**Spec:** [프로젝트 기획서](../../PROJECT_PLAN.md), [DB 구조](../../DATABASE_DESIGN.md), `AGENTS.md`, `apps/mobile/AGENTS.md`.

## 공통 제약

- 기본 검색 중심점은 남위례역·가락시장역, 반경은 각 3 km다. 좌표는 WGS84 위도·경도, 거리는 미터다.
- 기능별 Java 패키지 구조를 유지하고 DTO는 `class`와 Lombok을 사용한다. 직접 작성한 메서드에는 한 줄 기능 주석을 단다.
- 스키마 변경이 필요하면 Flyway를 사용한다. 현재 단계는 기존 테이블로 구현 가능하다.
- 앱은 공통 헤더·탭·API 모듈을 재사용하고 로딩·빈 결과·오류·재시도를 제공한다.
- 검색·지도 응답은 기존 200개 페이지 제한과 공간 인덱스를 고려해 서버에서 범위를 제한한다.

## 구현 순서

### 1. 이름 검색을 실제 데이터에 연결

**수정:** `RestaurantController`, `RestaurantService`, `RestaurantRepository`, `RestaurantControllerTest`, `RestaurantRepositoryIntegrationTest`, `apps/mobile/src/features/restaurants/api.ts`, `apps/mobile/src/components/AppHeader.tsx`, Expo Router 화면 경로.

- [ ] 현재 탭을 `app/(tabs)/`로 옮기고 루트 `Stack`을 두어 검색·상세 화면을 탭 밖에 표시한다. 기존 홈·지역 선택·탭 이동을 유지한다.
- [ ] `GET /api/v1/restaurants`에 선택적 `q`를 추가한다. 빈 검색어는 기존 목록과 같고, 검색어는 공백 제거 후 1~50자만 허용한다. 이름 부분 일치, 3 km 범위, 거리·ID 순 정렬, 200개 페이지를 유지한다. `%`와 `_`는 문자 그대로 검색한다.
- [ ] 저장소 통합 테스트로 한글 부분 일치, 특수문자, 범위 밖 제외, 동일 거리의 안정적 페이지 순서를 확인한다. 컨트롤러 테스트로 빈값과 길이 초과 입력의 `ProblemDetail` 응답을 확인한다.
- [ ] 헤더 검색 버튼을 `app/search.tsx`에 연결한다. 지역 이름과 검색창, 결과 `FlatList`, 로딩·빈 결과·오류·더 보기를 제공한다. 입력 중 이전 요청을 취소하고 검색 결과 행을 누르면 상세 화면으로 이동하도록 경로를 잡는다.
- [ ] `./gradlew test`와 `npm run typecheck`를 실행하고, iOS 시뮬레이터에서 남위례·가락동 검색과 뒤로 가기를 확인한다.

### 2. 음식점 상세 화면 연결

**수정/추가:** 식당 기능의 `controller/dto/service/repository`, `app/restaurants/[id].tsx`, `apps/mobile/src/features/restaurants/api.ts`, 홈·검색 목록 행.

- [ ] `GET /api/v1/restaurants/{id}`를 추가한다. `id`, 이름, 주소, 업종, 위도·경도, 메뉴 목록을 반환한다. 메뉴가 없으면 빈 목록으로 응답하고 없는 ID는 404 `ProblemDetail`로 응답한다. 출처 기준일은 최신 영업 정보가 아님을 표시할 수 있도록 포함한다.
- [ ] API·저장소 테스트로 존재/미존재 ID, 주소·업종 누락, 메뉴 없음과 메뉴 가격이 없는 경우를 확인한다.
- [ ] 홈과 검색의 음식점 행을 상세 화면으로 연결한다. 상세 화면은 주소·업종·메뉴를 표시하고, 값이 없으면 명확한 안내 문구를 보여준다. 리뷰 작성과 평점 표시는 실제 데이터·인증 흐름이 준비될 때 추가한다.
- [ ] `./gradlew test`, `npm run typecheck`, iOS 시뮬레이터에서 목록→상세→뒤로 가기를 확인한다.

### 3. 지도 탭 연결

**수정/추가:** `app/(tabs)/map.tsx`, 식당 지도 조회 DTO·저장소·API, 지도 의존성 및 설정.

- [ ] Expo SDK와 호환되는 지도 패키지 및 iOS·Android 지도 제공자 설정을 확인한다. 필요한 지도 키는 앱 설정으로 관리하고 저장소에 넣지 않는다.
- [ ] `GET /api/v1/restaurants/map`에서 지도 화면의 경계 좌표를 받아 경계 안의 식당 좌표·이름·ID만 반환한다. 허용 경계 크기와 최대 결과 수를 제한하고, 화면을 이동했을 때 다시 조회한다. 결과가 잘린 경우 앱에 안내한다.
- [ ] 경계값 검증, 경계 안/밖, 결과 상한을 저장소·컨트롤러 테스트로 확인한다.
- [ ] 선택한 역을 중심으로 지도를 열고 마커를 눌러 식당 이름과 상세 이동을 제공한다. 로딩·오류·재시도와 마커가 없는 상태를 표시한다.
- [ ] `./gradlew test`, `npm run typecheck`, iOS·Android에서 지도 이동·마커·상세 이동을 확인한다.

## 이후 순서

4. 음식점 데이터 갱신·오분류 정정 흐름을 마련한다. 공공데이터는 영업시간·가격의 실시간 정확성을 보장하지 않는다.
5. 사용자 인증과 리뷰 작성·수정·삭제를 구현한다.
6. 커뮤니티·식사 모집을 만든 뒤 채팅과 알림을 붙인다. 해당 탭의 준비 중 화면은 기능이 실제로 연결될 때 교체한다.

## 특히 확인할 상황

- 지역을 바꾸거나 검색어를 빠르게 입력할 때 이전 지역의 결과가 섞이지 않는가.
- `%`, `_`, 공백 등 입력으로 검색 결과가 잘못 넓어지지 않는가.
- 상세 주소·메뉴·가격이 없는 공공데이터 식당에서도 화면이 자연스럽게 보이는가.
- 지도 화면을 크게 이동하거나 확대했을 때 과도한 DB 조회와 누락된 마커를 어떻게 알리는가.
- 백엔드 연결 실패 시 앱이 빈 결과로 오해하게 만들지 않고 재시도를 제공하는가.
