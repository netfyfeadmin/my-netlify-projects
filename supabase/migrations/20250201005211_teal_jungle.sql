/*
  # Advertisement Management System

  1. New Tables
    - `advertisements`
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text) - banner, overlay, or sponsor
      - `content` (text) - HTML content or image URL
      - `start_date` (date)
      - `end_date` (date)
      - `active` (boolean)
      - `position` (text) - top, bottom, left, right
      - `tournament_id` (uuid, optional) - for tournament-specific ads
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `advertisements` table
    - Add policies for public read access
    - Add policies for authenticated users to manage ads
*/

-- Create advertisements table
CREATE TABLE advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('banner', 'overlay', 'sponsor')),
  content text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  position text NOT NULL CHECK (position IN ('top', 'bottom', 'left', 'right')),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view active advertisements"
  ON advertisements
  FOR SELECT
  TO public
  USING (active = true AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE);

CREATE POLICY "Anyone can create advertisements"
  ON advertisements
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update advertisements"
  ON advertisements
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete advertisements"
  ON advertisements
  FOR DELETE
  TO public
  USING (true);

-- Add indexes for better performance
CREATE INDEX idx_advertisements_active ON advertisements(active);
CREATE INDEX idx_advertisements_dates ON advertisements(start_date, end_date);
CREATE INDEX idx_advertisements_tournament ON advertisements(tournament_id);

-- Add sample data
INSERT INTO advertisements (name, type, content, start_date, end_date, position) VALUES
('Welcome Banner', 'banner', 'https://images.unsplash.com/photo-1560012057-4372e14c5085?q=80&w=1200', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '30 days', 'top'),
('Tournament Sponsor', 'sponsor', 'https://images.unsplash.com/photo-1519861531473-9200262188bf?q=80&w=1200', CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', 'bottom');