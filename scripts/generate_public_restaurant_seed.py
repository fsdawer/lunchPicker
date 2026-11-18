import argparse
import csv
import io
import math
import zipfile
from dataclasses import dataclass
from datetime import date
from pathlib import Path


CENTERS = ((37.46282, 127.13917), (37.49306, 127.11806))
EXCLUDED_MIDDLE = {"비알코올", "주점"}
EXCLUDED_SMALL = {"구내식당", "빵/도넛", "아이스크림/빙수", "떡/한과"}
REQUIRED_COLUMNS = {"상가업소번호", "상호명", "상권업종대분류코드", "상권업종중분류명",
                    "상권업종소분류명", "경도", "위도", "도로명주소", "지번주소"}


@dataclass(frozen=True)
class RestaurantRow:
    source_id: str
    name: str
    longitude: float
    latitude: float
    address: str
    category: str


# 두 좌표 사이의 구면 거리를 미터로 계산한다.
def distance_meters(latitude, longitude, center_latitude, center_longitude):
    lat1, lat2 = math.radians(latitude), math.radians(center_latitude)
    delta_latitude = lat1 - lat2
    delta_longitude = math.radians(longitude - center_longitude)
    a = (math.sin(delta_latitude / 2) ** 2
         + math.cos(lat1) * math.cos(lat2) * math.sin(delta_longitude / 2) ** 2)
    return 6_371_000 * 2 * math.asin(math.sqrt(a))


# 서울·경기 CSV에서 두 역 주변의 식사 가능한 업소를 중복 없이 읽는다.
def select_rows(zip_path: Path):
    seen = set()
    with zipfile.ZipFile(zip_path) as archive:
        for region in ("서울", "경기"):
            members = [name for name in archive.namelist()
                       if f"_{region}_" in name and name.endswith(".csv")]
            if len(members) != 1:
                raise ValueError(f"{region} CSV 파일을 하나만 찾을 수 있어야 합니다")
            with archive.open(members[0]) as raw:
                reader = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8-sig", newline=""))
                missing = REQUIRED_COLUMNS - set(reader.fieldnames or [])
                if missing:
                    raise ValueError(f"{region} CSV에 필요한 컬럼이 없습니다: {sorted(missing)}")
                for source in reader:
                    if source["상권업종대분류코드"] != "I2":
                        continue
                    if source["상권업종중분류명"].strip() in EXCLUDED_MIDDLE:
                        continue
                    if source["상권업종소분류명"].strip() in EXCLUDED_SMALL:
                        continue
                    source_id = source["상가업소번호"].strip()
                    name = source["상호명"].strip()
                    if not source_id or not name or source_id in seen:
                        continue
                    try:
                        longitude = float(source["경도"])
                        latitude = float(source["위도"])
                    except ValueError:
                        continue
                    if not (math.isfinite(latitude) and math.isfinite(longitude)
                            and -90 <= latitude <= 90 and -180 <= longitude <= 180):
                        continue
                    if not any(distance_meters(latitude, longitude, *center) <= 3100
                               for center in CENTERS):
                        continue
                    seen.add(source_id)
                    yield RestaurantRow(source_id, name, longitude, latitude,
                                        (source["도로명주소"] or source["지번주소"]).strip(),
                                        source["상권업종소분류명"].strip())


# SQL 문자열에서 작은따옴표와 NUL 문자를 안전하게 처리한다.
def sql_text(value: str):
    return "'" + value.replace("\x00", "").replace("'", "''") + "'"


# 250개 업소를 PostGIS의 정확한 3 km 조건으로 걸러 적재하는 SQL을 쓴다.
def write_batch(output, rows, snapshot_date):
    values = ",\n".join(
        f"    ({sql_text(row.source_id)}, {sql_text(row.name)}, {row.longitude}, {row.latitude}, "
        f"{sql_text(row.address)}, {sql_text(row.category)})"
        for row in rows
    )
    output.write(f"""WITH candidates (source_id, name, longitude, latitude, address, category) AS (
    VALUES
{values}
), points AS (
    SELECT source_id, name, address, category,
           public.ST_SetSRID(public.ST_MakePoint(longitude, latitude), 4326)::public.geography AS location
    FROM candidates
)
INSERT INTO lunchpicker.restaurants
    (name, location, source_name, source_id, address, category, source_snapshot_date)
SELECT name, location, 'sbiz', source_id, address, category, DATE '{snapshot_date}'
FROM points
WHERE public.ST_DWithin(location, public.ST_SetSRID(public.ST_MakePoint(127.13917, 37.46282), 4326)::public.geography, 3000)
   OR public.ST_DWithin(location, public.ST_SetSRID(public.ST_MakePoint(127.11806, 37.49306), 4326)::public.geography, 3000)
ON CONFLICT (source_name, source_id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    address = EXCLUDED.address,
    category = EXCLUDED.category,
    source_snapshot_date = EXCLUDED.source_snapshot_date;

""")


# 선택한 업소를 Flyway SQL 파일로 출력한다.
def generate_sql(zip_path: Path, output_path: Path, snapshot_date: str):
    date.fromisoformat(snapshot_date)
    count = 0
    batch = []
    with output_path.open("w", encoding="utf-8") as output:
        output.write(f"-- 소상공인시장진흥공단 상가(상권)정보, {snapshot_date} 공개 파일\n")
        output.write("-- https://www.data.go.kr/data/15083033/fileData.do\n")
        output.write("-- 서울·경기 음식 업종 중 카페·주점·제과·구내식당을 제외하고 두 역 3 km 안에 적재한다.\n\n")
        for row in select_rows(zip_path):
            batch.append(row)
            count += 1
            if len(batch) == 250:
                write_batch(output, batch, snapshot_date)
                batch.clear()
        if batch:
            write_batch(output, batch, snapshot_date)
    if count == 0:
        output_path.unlink()
        raise ValueError("적재할 음식점을 찾지 못했습니다")
    return count


# ZIP 경로와 기준일을 받아 Flyway 데이터 마이그레이션을 생성한다.
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("zip_path", type=Path)
    parser.add_argument("output_path", type=Path)
    parser.add_argument("--snapshot-date", required=True)
    args = parser.parse_args()
    print(f"SQL 후보 {generate_sql(args.zip_path, args.output_path, args.snapshot_date)}개 생성")


if __name__ == "__main__":
    main()
