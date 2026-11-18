import csv
import io
import tempfile
import unittest
import zipfile
from pathlib import Path

from generate_public_restaurant_seed import generate_sql, select_rows


class PublicRestaurantSeedTest(unittest.TestCase):
    # 두 역 주변의 식사 가능한 업소만 고르고 중복 업소번호를 제거한다.
    def test_selects_meal_shops_within_three_kilometers(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "shops.zip"
            with zipfile.ZipFile(path, "w") as archive:
                archive.writestr("상가정보_서울_202609.csv", self._csv([
                    ("1", "국밥집", "I2", "한식", "백반/한정식", "127.11806", "37.49306"),
                    ("2", "카페", "I2", "비알코올 ", "카페", "127.11806", "37.49306"),
                    ("3", "빵집", "I2", "기타 간이", "빵/도넛", "127.11806", "37.49306"),
                    ("4", "먼 식당", "I2", "한식", "백반/한정식", "127.30", "37.70"),
                ]))
                archive.writestr("상가정보_경기_202609.csv", self._csv([
                    ("1", "중복 국밥집", "I2", "한식", "백반/한정식", "127.13917", "37.46282"),
                    ("5", "분식집", "I2", "기타 간이", "김밥/만두/분식", "127.13917", "37.46282"),
                ]))

            rows = list(select_rows(path))

        self.assertEqual([row.source_id for row in rows], ["1", "5"])
        self.assertEqual([row.name for row in rows], ["국밥집", "분식집"])

    # 상호명에 작은따옴표가 있어도 실행 가능한 SQL 문자열로 생성한다.
    def test_escapes_shop_names_in_generated_sql(self):
        with tempfile.TemporaryDirectory() as directory:
            archive_path = Path(directory) / "shops.zip"
            output_path = Path(directory) / "seed.sql"
            with zipfile.ZipFile(archive_path, "w") as archive:
                archive.writestr("상가정보_서울_202609.csv", self._csv([
                    ("1", "O'Brien 식당", "I2", "한식", "백반/한정식", "127.11806", "37.49306"),
                ]))
                archive.writestr("상가정보_경기_202609.csv", self._csv([]))

            generate_sql(archive_path, output_path, "2026-09-30")
            sql = output_path.read_text(encoding="utf-8")

        self.assertIn("O''Brien 식당", sql)
        self.assertIn("ST_DWithin", sql)
        self.assertIn("3000", sql)

    # 테스트용 공공데이터 형식의 CSV를 생성한다.
    def _csv(self, shops):
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(("상가업소번호", "상호명", "상권업종대분류코드", "상권업종중분류명",
                         "상권업종소분류명", "경도", "위도", "도로명주소", "지번주소"))
        for shop in shops:
            writer.writerow((*shop, "서울시 테스트로 1", "서울시 테스트동 1"))
        return output.getvalue()


if __name__ == "__main__":
    unittest.main()
