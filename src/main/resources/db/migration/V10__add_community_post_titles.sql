ALTER TABLE lunchpicker.community_posts ADD COLUMN title VARCHAR(100);

UPDATE lunchpicker.community_posts
SET title = LEFT(COALESCE(NULLIF(BTRIM(SPLIT_PART(BTRIM(body), E'\n', 1)), ''), '제목 없는 글'), 100);

ALTER TABLE lunchpicker.community_posts ALTER COLUMN title SET NOT NULL;
ALTER TABLE lunchpicker.community_posts
    ADD CONSTRAINT community_posts_title_length CHECK (CHAR_LENGTH(BTRIM(title)) BETWEEN 1 AND 100);
