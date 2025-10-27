-- Delete data from all tables in correct order to respect foreign keys
DELETE FROM invoice_items;
DELETE FROM invoices;
DELETE FROM project_works;
DELETE FROM project_blocks;
DELETE FROM projects;
DELETE FROM clients;
DELETE FROM works;
DELETE FROM categories;