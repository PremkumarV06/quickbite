-- 1. Insert Default Users
-- passwords are stored in plain text for this simple project demonstration to make custom auth straightforward.
INSERT INTO users (name, email, password, role, address, phone) VALUES
('John Doe', 'customer@quickbite.com', 'password', 'CUSTOMER', '123 Main St, Springfield', '123-456-7890'),
('Alice Smith', 'owner@quickbite.com', 'password', 'OWNER', '456 Resto Lane, Springfield', '987-654-3210'),
('Bob Rider', 'driver@quickbite.com', 'password', 'DRIVER', '789 Depot Ave, Springfield', '555-123-4567');

-- 2. Insert Default Restaurants
INSERT INTO restaurants (name, cuisine, address, phone, image_url) VALUES
('Burger Bistro', 'American', '101 Gourmet Way, Springfield', '111-222-3333', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80'),
('Pizza Palace', 'Italian', '202 Margherita Blvd, Springfield', '444-555-6666', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80'),
('Sushi Supreme', 'Japanese', '303 Wasabi Circle, Springfield', '777-888-9999', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=500&q=80');

-- 3. Insert Menu Items for Burger Bistro (ID: 1)
INSERT INTO menu_items (restaurant_id, name, description, price, category, image_url, available) VALUES
(1, 'Classic Cheeseburger', 'Juicy beef patty, melted cheddar cheese, lettuce, tomato, pickles, and our signature sauce.', 9.99, 'Main Course', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80', TRUE),
(1, 'Crispy French Fries', 'Golden brown, salted potato fries served crispy hot.', 3.49, 'Appetizer', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=300&q=80', TRUE),
(1, 'Chocolate Milkshake', 'Thick and creamy chocolate milkshake topped with whipped cream and a cherry.', 4.99, 'Beverage', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=300&q=80', TRUE);

-- 4. Insert Menu Items for Pizza Palace (ID: 2)
INSERT INTO menu_items (restaurant_id, name, description, price, category, image_url, available) VALUES
(2, 'Margherita Pizza', 'Fresh mozzarella cheese, tomato sauce, and aromatic basil leaves on a thin wood-fired crust.', 12.99, 'Main Course', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=300&q=80', TRUE),
(2, 'Garlic Knots', 'Freshly baked rolls tossed in garlic butter, fresh parsley, and parmesan cheese.', 5.99, 'Appetizer', 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&w=300&q=80', TRUE),
(2, 'Classic Tiramisu', 'Layered Italian dessert made with coffee-dipped ladyfingers, mascarpone cheese, and cocoa powder.', 6.49, 'Dessert', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=300&q=80', TRUE);

-- 5. Insert Menu Items for Sushi Supreme (ID: 3)
INSERT INTO menu_items (restaurant_id, name, description, price, category, image_url, available) VALUES
(3, 'California Roll', 'Crab salad, avocado, and fresh cucumber rolled with sushi rice and sesame seeds.', 8.99, 'Main Course', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=300&q=80', TRUE),
(3, 'Steamed Edamame', 'Fresh soy bean pods steamed and lightly sprinkled with flaky sea salt.', 4.99, 'Appetizer', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=300&q=80', TRUE),
(3, 'Green Tea Mochi', 'Sweet Japanese rice cakes filled with premium green tea ice cream.', 5.49, 'Dessert', 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=300&q=80', TRUE);
