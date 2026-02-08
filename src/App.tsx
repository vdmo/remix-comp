import { useState } from 'react';
import { Music, Upload, LogIn, LogOut, User } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { SubmissionForm } from './components/SubmissionForm';
import { MusicPlayer } from './components/MusicPlayer';

function AppContent() {
  const { user, signOut, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'listen' | 'submit'>('listen');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSubmissionSuccess = () => {
    setActiveTab('listen');
    setRefreshTrigger((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Music className="text-blue-600" size={32} />
              <h1 className="text-2xl font-bold text-gray-900">Remix Competition</h1>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User size={20} />
                    <span className="text-sm font-medium">{user.email}</span>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <LogOut size={20} />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <LogIn size={20} />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('listen')}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                activeTab === 'listen'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Music size={20} />
              <span className="font-medium">Listen & Vote</span>
            </button>
            <button
              onClick={() => setActiveTab('submit')}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                activeTab === 'submit'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Upload size={20} />
              <span className="font-medium">Submit Entry</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'listen' ? (
          <MusicPlayer
            onAuthRequired={() => setAuthModalOpen(true)}
            refreshTrigger={refreshTrigger}
          />
        ) : (
          <SubmissionForm
            onSuccess={handleSubmissionSuccess}
            onAuthRequired={() => setAuthModalOpen(true)}
          />
        )}
      </main>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
