CREATE SCHEMA IF NOT EXISTS ducklake_catalog;
CREATE SCHEMA IF NOT EXISTS auth_mgmt;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS auth_mgmt.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
