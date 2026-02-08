/*
  # Remix Competition Schema

  1. New Tables
    - `submissions`
      - `id` (uuid, primary key) - Unique identifier for each submission
      - `user_id` (uuid, foreign key to auth.users) - User who submitted the track
      - `title` (text) - Song title
      - `artist_name` (text) - Artist/contestant name
      - `audio_url` (text) - URL to the audio file in Supabase Storage
      - `file_path` (text) - Storage path for file management
      - `vote_count` (integer) - Cached count of votes for performance
      - `created_at` (timestamptz) - Submission timestamp
      - `updated_at` (timestamptz) - Last update timestamp

    - `votes`
      - `id` (uuid, primary key) - Unique identifier for each vote
      - `user_id` (uuid, foreign key to auth.users) - User who voted
      - `submission_id` (uuid, foreign key to submissions) - Submission being voted on
      - `created_at` (timestamptz) - Vote timestamp
      - Unique constraint on (user_id, submission_id) - One vote per user per submission

  2. Storage
    - Create storage bucket for audio files
    - Set up policies for upload and public access

  3. Security
    - Enable RLS on all tables
    - Submissions: Anyone can read, only authenticated users can create their own
    - Votes: Anyone can read vote counts, only authenticated users can vote (once per submission)

  4. Functions
    - Trigger to increment/decrement vote_count on submissions table
*/

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  artist_name text NOT NULL,
  audio_url text NOT NULL,
  file_path text NOT NULL,
  vote_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  submission_id uuid REFERENCES submissions(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, submission_id)
);

-- Enable RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Submissions policies
CREATE POLICY "Anyone can view submissions"
  ON submissions FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create submissions"
  ON submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions"
  ON submissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own submissions"
  ON submissions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Votes policies
CREATE POLICY "Anyone can view votes"
  ON votes FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create votes"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_vote_count ON submissions(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_votes_submission_id ON votes(submission_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);

-- Function to update vote count
CREATE OR REPLACE FUNCTION update_submission_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE submissions 
    SET vote_count = vote_count + 1 
    WHERE id = NEW.submission_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE submissions 
    SET vote_count = vote_count - 1 
    WHERE id = OLD.submission_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update vote count
DROP TRIGGER IF EXISTS trigger_update_vote_count ON votes;
CREATE TRIGGER trigger_update_vote_count
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_submission_vote_count();

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-submissions', 'audio-submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for audio submissions
CREATE POLICY "Anyone can view audio files"
  ON storage.objects FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'audio-submissions');

CREATE POLICY "Authenticated users can upload audio files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'audio-submissions' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own audio files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'audio-submissions' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'audio-submissions' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own audio files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'audio-submissions' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );