package com.lunchpicker.database;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.ResultSet;
import java.util.HashSet;
import java.util.Set;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "RUN_DB_TESTS", matches = "true")
class DatabaseSchemaIntegrationTest {
    @Autowired DataSource dataSource;

    // Flyway가 설계된 업무 테이블을 lunchpicker 스키마에 생성하는지 확인한다.
    @Test
    void createsPlannedTablesInLunchpickerSchema() throws Exception {
        Set<String> tables = new HashSet<>();
        try (Connection connection = dataSource.getConnection();
             ResultSet result = connection.getMetaData().getTables(null, "lunchpicker", "%", new String[] {"TABLE"})) {
            while (result.next()) {
                tables.add(result.getString("TABLE_NAME"));
            }
        }

        assertThat(tables).contains(
                "restaurants", "users", "reviews", "menus", "companies",
                "company_memberships", "meal_meetups", "meal_meetup_members", "login_sessions", "community_posts");
    }
}
