/*
  # Add Demo Data

  1. Sample Data for:
    - Clubs
    - Teams
    - Players
    - Player-Team relationships
    - Tournaments
    - Tournament matches
    - Scoreboards

  2. Data includes:
    - Real-world inspired club names
    - Realistic player names and details
    - Active tournaments and matches
*/

-- Add sample clubs
INSERT INTO clubs (id, name, address, phone, email, website) VALUES
  ('d7a23c10-2e0d-4c7c-9a4f-43c7622f0a1d', 'Tennis Club Westend', '123 Westend Street, Berlin', '+49 30 12345678', 'info@tcwestend.de', 'https://tcwestend.de'),
  ('f8b45a20-3f1e-5d8d-8b5e-54d8733f1b2e', 'Royal Tennis Club', '45 Kings Road, London', '+44 20 87654321', 'contact@royaltennis.uk', 'https://royaltennis.uk'),
  ('c9d56b30-4f2f-6e9e-9c6f-65e9844f2c3f', 'Club de Padel Madrid', 'Calle Principal 67, Madrid', '+34 91 2345678', 'info@padelmdrid.es', 'https://padelmadrid.es');

-- Add sample teams
INSERT INTO teams (id, club_id, name, division) VALUES
  ('11111111-1111-1111-1111-111111111111', 'd7a23c10-2e0d-4c7c-9a4f-43c7622f0a1d', 'Westend Warriors', '1st Division'),
  ('22222222-2222-2222-2222-222222222222', 'd7a23c10-2e0d-4c7c-9a4f-43c7622f0a1d', 'Westend Legends', '2nd Division'),
  ('33333333-3333-3333-3333-333333333333', 'f8b45a20-3f1e-5d8d-8b5e-54d8733f1b2e', 'Royal Aces', 'Premier Division'),
  ('44444444-4444-4444-4444-444444444444', 'c9d56b30-4f2f-6e9e-9c6f-65e9844f2c3f', 'Madrid Masters', 'Liga Pro');

-- Add sample players
INSERT INTO players (id, first_name, last_name, birthdate, gender, email, phone, ranking) VALUES
  ('55555555-5555-5555-5555-555555555555', 'John', 'Smith', '1990-05-15', 'male', 'john.smith@email.com', '+1234567890', 1),
  ('66666666-6666-6666-6666-666666666666', 'Emma', 'Johnson', '1992-08-22', 'female', 'emma.j@email.com', '+2345678901', 2),
  ('77777777-7777-7777-7777-777777777777', 'Carlos', 'Garcia', '1988-11-30', 'male', 'carlos.g@email.com', '+3456789012', 3),
  ('88888888-8888-8888-8888-888888888888', 'Maria', 'Rodriguez', '1995-03-18', 'female', 'maria.r@email.com', '+4567890123', 4),
  ('99999999-9999-9999-9999-999999999999', 'David', 'Wilson', '1993-07-25', 'male', 'david.w@email.com', '+5678901234', 5),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sophie', 'Brown', '1991-12-10', 'female', 'sophie.b@email.com', '+6789012345', 6),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Lucas', 'Martinez', '1994-09-05', 'male', 'lucas.m@email.com', '+7890123456', 7),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Anna', 'Taylor', '1989-04-20', 'female', 'anna.t@email.com', '+8901234567', 8);

-- Add player-team relationships
INSERT INTO player_teams (player_id, team_id, active) VALUES
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', true),
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', true),
  ('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', true),
  ('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', true),
  ('99999999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', true);

-- Add sample tournaments (including one that's active today)
INSERT INTO tournaments (id, name, start_date, end_date, num_courts) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Spring Championship 2025', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', 3),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Summer Open 2025', '2025-07-15', '2025-07-20', 4),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Winter Classic 2025', '2025-12-10', '2025-12-15', 3);

-- Add sample tournament matches for today's tournament
INSERT INTO tournament_matches (tournament_id, court_number, scheduled_time, team1_name, team2_name, status) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 1, CURRENT_TIMESTAMP + INTERVAL '1 hour', 'Westend Warriors', 'Royal Aces', 'scheduled'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 2, CURRENT_TIMESTAMP + INTERVAL '1 hour', 'Madrid Masters', 'Westend Legends', 'scheduled'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 3, CURRENT_TIMESTAMP + INTERVAL '2 hours', 'Royal Aces', 'Madrid Masters', 'scheduled'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 1, CURRENT_TIMESTAMP + INTERVAL '3 hours', 'Westend Warriors', 'Westend Legends', 'scheduled');

-- Add sample active scoreboard
INSERT INTO scoreboards ("matchTitle", "gameType", "matchType", sets, team1, team2, tournament_id, court_number) VALUES
  (
    'Quarter Finals - Court 1',
    'tennis',
    'doubles',
    3,
    '{
      "name": "Westend Warriors",
      "players": ["John Smith", "Emma Johnson"],
      "sets": 1,
      "games": 4,
      "points": "30",
      "isServing": true
    }'::jsonb,
    '{
      "name": "Royal Aces",
      "players": ["David Wilson", "Sophie Brown"],
      "sets": 0,
      "games": 3,
      "points": "0",
      "isServing": false
    }'::jsonb,
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    1
  );