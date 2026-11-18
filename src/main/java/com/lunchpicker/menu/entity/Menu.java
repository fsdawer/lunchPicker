package com.lunchpicker.menu.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "menus", schema = "lunchpicker")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Menu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Column(name = "restaurant_id", nullable = false)
    private long restaurantId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "price_krw")
    private Integer priceKrw;
}
