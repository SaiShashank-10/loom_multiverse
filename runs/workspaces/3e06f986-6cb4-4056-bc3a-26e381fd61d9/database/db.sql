-- Create the 'suppliers' table
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255)
);

-- Create the 'products' table with a foreign key referencing 'suppliers'
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id),
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2)
);

-- Create the 'shipping_details' table with a foreign key referencing 'products'
CREATE TABLE shipping_details (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    carrier VARCHAR(255),
    tracking_number VARCHAR(255)
);