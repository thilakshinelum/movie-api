-- Movie API database (Backend Development, Week 4)
-- Run this in pgAdmin's Query Tool for the backend_course database.
-- It recreates the movies table and fills it with the starting data.

DROP TABLE IF EXISTS movies;

CREATE TABLE movies (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(200) NOT NULL CHECK (length(trim(title)) > 0),
    director VARCHAR(200) NOT NULL CHECK (length(trim(director)) > 0),
    release_year INTEGER NOT NULL CHECK (release_year >= 1888)
);

INSERT INTO movies (
    title,
    director,
    release_year
)
VALUES
    ('Inception', 'Christopher Nolan', 2010),
    ('The Matrix', 'The Wachowskis', 1999),
    ('Parasite', 'Bong Joon-ho', 2019);

SELECT *
FROM movies
ORDER BY id;
