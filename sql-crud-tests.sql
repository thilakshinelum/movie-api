-- SQL CRUD tests (Week 4, Task 3.2)
-- Run these one at a time in pgAdmin's Query Tool after database.sql.
-- Tip: select one statement with the mouse and press F5 to run only that one.

-- 1. Select all movies
SELECT * FROM movies ORDER BY id;

-- 2. Select one movie by id
SELECT * FROM movies WHERE id = 1;

-- 3. Insert a new movie (PostgreSQL creates the id)
INSERT INTO movies (title, director, release_year)
VALUES ('Arrival', 'Denis Villeneuve', 2016)
RETURNING *;

-- 4. Update a movie
UPDATE movies
SET release_year = 2011
WHERE id = 1
RETURNING *;

-- 5. Delete a movie
DELETE FROM movies
WHERE id = 4
RETURNING *;

-- 6. A constraint in action: this fails because director is NOT NULL
INSERT INTO movies (title, release_year)
VALUES ('No Director', 2020);
