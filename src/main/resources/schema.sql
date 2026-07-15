-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS delivery_tracking;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS restaurants;
DROP TABLE IF EXISTS users;

-- 1. Users Table (Customers, Restaurant Owners, Delivery Drivers)
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL, -- CUSTOMER, OWNER, DRIVER
    address VARCHAR(255),
    phone VARCHAR(20)
);

-- 2. Restaurants Table
CREATE TABLE restaurants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    cuisine VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    image_url VARCHAR(255),
    logo_url VARCHAR(255),
    banner_url VARCHAR(255),
    rating DECIMAL(3,2) DEFAULT 4.0,
    reviews_count INT DEFAULT 50,
    delivery_time INT DEFAULT 30,
    delivery_fee DECIMAL(10,2) DEFAULT 20.00,
    offers VARCHAR(255) DEFAULT '',
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    min_order DECIMAL(10,2) DEFAULT 100.00
);

-- 3. Menu Items Table
CREATE TABLE menu_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    image_url VARCHAR(255),
    available BOOLEAN NOT NULL DEFAULT TRUE,
    rating DECIMAL(3,2) DEFAULT 4.0,
    reviews_count INT DEFAULT 20,
    is_veg BOOLEAN NOT NULL DEFAULT TRUE,
    ingredients VARCHAR(1000) DEFAULT '',
    calories INT DEFAULT 300,
    protein INT DEFAULT 10,
    carbs INT DEFAULT 40,
    fat INT DEFAULT 10,
    prep_time INT DEFAULT 20,
    recommended_sides VARCHAR(500) DEFAULT '',
    region VARCHAR(100) DEFAULT 'Traditional',
    spice_level VARCHAR(20) DEFAULT 'Medium',
    cooking_time INT DEFAULT 15,
    multiple_images VARCHAR(1000) DEFAULT '',
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 4. Orders Table
CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    restaurant_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL, -- PENDING, PREPARING, OUT_FOR_DELIVERY, DELIVERED, CANCELLED
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_address VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- 5. Order Items Table
CREATE TABLE order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    menu_item_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- 6. Delivery Tracking Table
CREATE TABLE delivery_tracking (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL, -- ASSIGNED, PREPARING, PICKED_UP, DELIVERED
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    estimated_minutes INT NOT NULL DEFAULT 30,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
