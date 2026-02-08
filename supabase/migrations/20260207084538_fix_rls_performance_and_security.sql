/*
  # Fix RLS Performance and Security Issues

  1. Performance Optimizations
    - Update all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
    - This prevents re-evaluation of auth functions for each row, improving query performance at scale
    - Set stable search_path for trigger function to prevent security vulnerabilities

  2. Changes Made
    - Drop and recreate submissions policies with optimized auth checks
    - Drop and recreate votes policies with optimized auth checks
    - Update update_submission_vote_count function with secure search_path

  3. Security Improvements
    - Prevent search_path manipulation attacks on trigger function
    - Maintain same access control logic with better performance
*/

-- Drop existing policies for submissions
DROP POLICY IF EXISTS "Anyone can view submissions" ON submissions;
DROP POLICY IF EXISTS "Authenticated users can create submissions" ON submissions;
DROP POLICY IF EXISTS "Users can update own submissions" ON submissions;
DROP POLICY IF EXISTS "Users can delete own submissions" ON submissions;

-- Recreate submissions policies with optimized auth checks
CREATE POLICY "Anyone can view submissions"
  ON submissions FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create submissions"
  ON submissions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own submissions"
  ON submissions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own submissions"
  ON submissions FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop existing policies for votes
DROP POLICY IF EXISTS "Anyone can view votes" ON votes;
DROP POLICY IF EXISTS "Authenticated users can create votes" ON votes;
DROP POLICY IF EXISTS "Users can delete own votes" ON votes;

-- Recreate votes policies with optimized auth checks
CREATE POLICY "Anyone can view votes"
  ON votes FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create votes"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Recreate function with secure search_path
CREATE OR REPLACE FUNCTION update_submission_vote_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
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
$$;