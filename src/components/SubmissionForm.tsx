import { useState } from 'react';
import { Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type SubmissionFormProps = {
  onSuccess: () => void;
  onAuthRequired: () => void;
};

export function SubmissionForm({ onSuccess, onAuthRequired }: SubmissionFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('audio/')) {
        setError('Please select an audio file');
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      onAuthRequired();
      return;
    }

    if (!file) {
      setError('Please select an audio file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-submissions')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('audio-submissions')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('submissions')
        .insert({
          user_id: user.id,
          title,
          artist_name: artistName,
          audio_url: urlData.publicUrl,
          file_path: fileName,
        });

      if (dbError) throw dbError;

      setTitle('');
      setArtistName('');
      setFile(null);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload submission');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6">Submit Your Remix</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Track Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your track title"
            />
          </div>

          <div>
            <label htmlFor="artistName" className="block text-sm font-medium text-gray-700 mb-1">
              Artist Name
            </label>
            <input
              id="artistName"
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your artist name"
            />
          </div>

          <div>
            <label htmlFor="audioFile" className="block text-sm font-medium text-gray-700 mb-1">
              Audio File
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="audioFile"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                  >
                    <span>Upload a file</span>
                    <input
                      id="audioFile"
                      type="file"
                      accept="audio/*"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  Audio files up to 50MB
                </p>
                {file && (
                  <p className="text-sm text-green-600 font-medium">
                    Selected: {file.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
          >
            {uploading ? 'Uploading...' : 'Submit Entry'}
          </button>

          {!user && (
            <p className="text-sm text-gray-600 text-center">
              You need to sign in to submit your remix
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
