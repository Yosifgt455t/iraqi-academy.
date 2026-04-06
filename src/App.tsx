import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Grade } from './types';
import Auth from './components/Auth';
import GradeSelector from './components/GradeSelector';
import Dashboard from './components/Dashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setGrade(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('grade')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setGrade(data?.grade || null);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
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

  if (!session) {
    return <Auth />;
  }

  if (!grade) {
    return <GradeSelector userId={session.user.id} onComplete={setGrade} />;
  }

  return <Dashboard user={session.user} grade={grade} onChangeGrade={() => setGrade(null)} />;
}
