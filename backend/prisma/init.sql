-- Drop existing tables if they exist
DROP TABLE IF EXISTS "PlayerPoint";
DROP TABLE IF EXISTS "ContestEntry";
DROP TABLE IF EXISTS "TeamPlayer";
DROP TABLE IF EXISTS "UserTeam";
DROP TABLE IF EXISTS "Contest";
DROP TABLE IF EXISTS "Player";
DROP TABLE IF EXISTS "Match";
DROP TABLE IF EXISTS "Team";
DROP TABLE IF EXISTS "User";

-- Users Table
CREATE TABLE "User" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    password TEXT NOT NULL,
    "walletBalance" DECIMAL(10, 2) DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams Table
CREATE TABLE "Team" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    "shortName" VARCHAR(10) NOT NULL,
    logo TEXT
);

-- Matches Table
CREATE TABLE "Match" (
    id SERIAL PRIMARY KEY,
    "teamAId" INTEGER REFERENCES "Team"(id),
    "teamBId" INTEGER REFERENCES "Team"(id),
    "matchStartTime" TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'UPCOMING'
);

-- Players Table
CREATE TABLE "Player" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    "teamId" INTEGER REFERENCES "Team"(id),
    role VARCHAR(20),
    credit DECIMAL(10, 1)
);

-- Contests Table
CREATE TABLE "Contest" (
    id SERIAL PRIMARY KEY,
    "matchId" INTEGER REFERENCES "Match"(id),
    "entryFee" DECIMAL(10, 2) NOT NULL,
    "totalSpots" INTEGER NOT NULL,
    "joinedSpots" INTEGER DEFAULT 0,
    "prizePool" DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN'
);

-- User Teams Table
CREATE TABLE "UserTeam" (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER REFERENCES "User"(id),
    "matchId" INTEGER REFERENCES "Match"(id),
    "captainId" INTEGER,
    "viceCaptainId" INTEGER,
    UNIQUE("userId", "matchId")
);

-- Team Players (Bridge for UserTeam and Player)
CREATE TABLE "TeamPlayer" (
    id SERIAL PRIMARY KEY,
    "userTeamId" INTEGER REFERENCES "UserTeam"(id),
    "playerId" INTEGER REFERENCES "Player"(id)
);

-- Contest Entries Table
CREATE TABLE "ContestEntry" (
    id SERIAL PRIMARY KEY,
    "contestId" INTEGER REFERENCES "Contest"(id),
    "userId" INTEGER REFERENCES "User"(id),
    "userTeamId" INTEGER REFERENCES "UserTeam"(id),
    points DECIMAL(10, 2) DEFAULT 0,
    rank INTEGER,
    UNIQUE("contestId", "userTeamId")
);

-- Player Points Table (Per Match)
CREATE TABLE "PlayerPoint" (
    id SERIAL PRIMARY KEY,
    "matchId" INTEGER REFERENCES "Match"(id),
    "playerId" INTEGER REFERENCES "Player"(id),
    points DECIMAL(10, 2) NOT NULL,
    UNIQUE("matchId", "playerId")
);

-- SEED DATA
INSERT INTO "Team" (name, "shortName") VALUES ('India', 'IND'), ('Australia', 'AUS');

INSERT INTO "Match" ("teamAId", "teamBId", "matchStartTime", status) 
VALUES (1, 2, CURRENT_TIMESTAMP + interval '1 day', 'UPCOMING');

INSERT INTO "Contest" ("matchId", "entryFee", "totalSpots", "prizePool", status)
VALUES (1, 49.00, 1000, 40000.00, 'OPEN');

-- Seed players for IND
INSERT INTO "Player" (name, "teamId", role, credit) VALUES 
('Rohit Sharma', 1, 'BAT', 10.5),
('Virat Kohli', 1, 'BAT', 11.0),
('Jasprit Bumrah', 1, 'BOWL', 9.5),
('KL Rahul', 1, 'WK', 9.0);

-- Seed players for AUS
INSERT INTO "Player" (name, "teamId", role, credit) VALUES 
('David Warner', 2, 'BAT', 10.0),
('Steve Smith', 2, 'BAT', 10.5),
('Pat Cummins', 2, 'BOWL', 9.5),
('Glenn Maxwell', 2, 'AR', 9.0);
