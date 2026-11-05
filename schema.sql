CREATE DATABASE IF NOT EXISTS lab_equipment_db;
USE lab_equipment_db;

CREATE TABLE IF NOT EXISTS equipment (
  equipment_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  available_quantity INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Available'
);

CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  role VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS issue_records (
  issue_id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id INT NOT NULL,
  user_id INT NOT NULL,
  issue_date DATE NOT NULL,
  return_date DATE NULL,
  quantity INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Issued',
  CONSTRAINT fk_issue_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id),
  CONSTRAINT fk_issue_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Sample data (optional)
INSERT INTO equipment (name, category, quantity, available_quantity, status) VALUES
('Arduino Uno', 'Microcontroller', 10, 8, 'Available'),
('Digital Multimeter', 'Measurement', 6, 6, 'Available'),
('Breadboard', 'Electronics', 15, 12, 'Available'),
('Soldering Iron', 'Electronics', 5, 5, 'Available');

INSERT INTO users (name, email, role) VALUES
('Arun Kumar', 'arun@example.com', 'Student'),
('Priya Sharma', 'priya@example.com', 'Faculty'),
('Lab Admin', 'admin@example.com', 'Admin');
