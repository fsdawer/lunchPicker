ALTER TABLE lunchpicker.restaurants
    ADD COLUMN source_name VARCHAR(20),
    ADD COLUMN source_id VARCHAR(40),
    ADD COLUMN address TEXT,
    ADD COLUMN category VARCHAR(100),
    ADD COLUMN source_snapshot_date DATE,
    ADD CONSTRAINT restaurants_source_pair_check
        CHECK ((source_name IS NULL) = (source_id IS NULL)),
    ADD CONSTRAINT restaurants_source_key_unique UNIQUE (source_name, source_id);
