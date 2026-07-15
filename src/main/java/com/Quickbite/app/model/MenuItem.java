package com.Quickbite.app.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "menu_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MenuItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @Column(nullable = false)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private Double price;

    @Column(nullable = false)
    private String category;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(nullable = false)
    private Boolean available = true;

    private Double rating;

    @Column(name = "reviews_count")
    private Integer reviewsCount;

    @Column(name = "is_veg", nullable = false)
    private Boolean isVeg = true;

    @Column(length = 1000)
    private String ingredients;

    private Integer calories;

    private Integer protein;

    private Integer carbs;

    private Integer fat;

    @Column(name = "prep_time")
    private Integer prepTime;

    @Column(name = "recommended_sides", length = 500)
    private String recommendedSides;

    private String region;

    @Column(name = "spice_level")
    private String spiceLevel;

    @Column(name = "cooking_time")
    private Integer cookingTime;

    @Column(name = "multiple_images", length = 1000)
    private String multipleImages;
}
