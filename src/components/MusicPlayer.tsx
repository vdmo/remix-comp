import { useEffect, useState } from 'react';
import { Heart, Share2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Submission } from '../lib/supabase';

type MusicPlayerProps = {
  onAuthRequired: () => void;
  refreshTrigger: number;
};

export function MusicPlayer({ onAuthRequired, refreshTrigger }: MusicPlayerProps) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmissions();
  }, [refreshTrigger]);

  useEffect(() => {
    if (user) {
      loadUserVotes();
    } else {
      setUserVotes(new Set());
    }
  }, [user]);

  const loadSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('vote_count', { ascending: false });

    if (!error && data) {
      setSubmissions(data);
    }
    setLoading(false);
  };

  const loadUserVotes = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('votes')
      .select('submission_id')
      .eq('user_id', user.id);

    if (data) {
      setUserVotes(new Set(data.map((v) => v.submission_id)));
    }
  };

  const handleVote = async (submissionId: string) => {
    if (!user) {
      onAuthRequired();
      return;
    }

    const hasVoted = userVotes.has(submissionId);

    if (hasVoted) {
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('user_id', user.id)
        .eq('submission_id', submissionId);

      if (!error) {
        setUserVotes((prev) => {
          const next = new Set(prev);
          next.delete(submissionId);
          return next;
        });
        loadSubmissions();
      }
    } else {
      const { error } = await supabase
        .from('votes')
        .insert({
          user_id: user.id,
          submission_id: submissionId,
        });

      if (!error) {
        setUserVotes((prev) => new Set(prev).add(submissionId));
        loadSubmissions();
      }
    }
  };

  const handleShare = (submission: Submission) => {
    const shareUrl = window.location.href;
    const text = `Check out "${submission.title}" by ${submission.artist_name} in the remix competition!`;

    if (navigator.share) {
      navigator.share({
        title: submission.title,
        text: text,
        url: shareUrl,
      });
    } else {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
      window.open(twitterUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No submissions yet. Be the first to submit!</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Competition Entries</h2>
      <div className="space-y-4">
        {submissions.map((submission) => {
          const hasVoted = userVotes.has(submission.id);

          return (
            <div
              key={submission.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{submission.title}</h3>
                  <p className="text-gray-600 mt-1">{submission.artist_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleVote(submission.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      hasVoted
                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Heart
                      size={20}
                      fill={hasVoted ? 'currentColor' : 'none'}
                    />
                    <span className="font-semibold">{submission.vote_count}</span>
                  </button>
                  <button
                    onClick={() => handleShare(submission)}
                    className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              </div>

              <audio
                controls
                controlsList="nodownload"
                className="w-full"
                src={submission.audio_url}
              >
                Your browser does not support the audio element.
              </audio>

              <p className="text-sm text-gray-500 mt-3">
                Submitted {new Date(submission.created_at).toLocaleDateString()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
