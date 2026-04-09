import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Grade } from './types';
import Auth from './components/Auth';
import GradeSelector from './components/GradeSelector';
import Dashboard from './components/Dashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if guest mode was previously active
    const savedGuest = localStorage.getItem('isGuest') === 'true';
    if (savedGuest) {
      setIsGuest(true);
      const savedGrade = localStorage.getItem('guestGrade') as Grade;
      if (savedGrade) setGrade(savedGrade);
    }

    // Check current session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Auth session error:', error.message);
        // If refresh token is invalid, sign out to clear local state
        if (error.message.includes('refresh_token')) {
          supabase.auth.signOut();
        }
        setLoading(false);
        return;
      }
      setSession(session);
      if (session) {
        setIsGuest(false);
        fetchProfile(session.user.id);
      } else if (!savedGuest) {
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setIsGuest(false);
        localStorage.removeItem('isGuest');
        fetchProfile(session.user.id);
      } else if (!isGuest) {
        setGrade(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isGuest]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('grade')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data?.grade) {
        setGrade(data.grade);
        localStorage.setItem('savedGrade', data.grade);
      } else {
        // Check if we have a locally saved grade as fallback
        const localGrade = localStorage.getItem('savedGrade') as Grade;
        if (localGrade) setGrade(localGrade);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      const localGrade = localStorage.getItem('savedGrade') as Grade;
      if (localGrade) setGrade(localGrade);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    setIsGuest(true);
    localStorage.setItem('isGuest', 'true');
    const localGrade = localStorage.getItem('guestGrade') as Grade;
    if (localGrade) setGrade(localGrade);
  };

  const handleSetGrade = (newGrade: Grade) => {
    setGrade(newGrade);
    if (isGuest) {
      localStorage.setItem('guestGrade', newGrade);
    } else {
      localStorage.setItem('savedGrade', newGrade);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('savedGrade');
    localStorage.removeItem('guestGrade');
    localStorage.removeItem('isGuest');
    if (isGuest) {
      setIsGuest(false);
      setGrade(null);
    } else {
      await supabase.auth.signOut();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-blue-600 mx-auto" size={48} />
          <p className="text-slate-600 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!session && !isGuest) {
    return <Auth onGuest={handleGuestMode} />;
  }

  const userId = session?.user?.id || 'guest_user';
  const user = session?.user || { id: 'guest_user', user_metadata: { full_name: 'زائر' } };

  if (!grade) {
    return <GradeSelector userId={userId} onComplete={handleSetGrade} />;
  }

  return <Dashboard user={user} grade={grade} onChangeGrade={() => setGrade(null)} onLogout={handleLogout} />;
}
