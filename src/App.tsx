import { useState, useEffect } from 'react';
import { auth, logout, getUserProfile } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Grade } from './types';
import Auth from './components/Auth';
import ProfileSetup from './components/ProfileSetup';
import GradeSelector from './components/GradeSelector';
import Dashboard from './components/Dashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedGuest = localStorage.getItem('isGuest') === 'true';
    if (savedGuest) {
      setIsGuest(true);
      const savedGrade = localStorage.getItem('guestGrade') as Grade;
      if (savedGrade) setGrade(savedGrade);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setIsGuest(false);
        localStorage.removeItem('isGuest');
        
        try {
          const userProfile = await getUserProfile(firebaseUser.uid);
          if (userProfile) {
            setProfile(userProfile);
            if (userProfile.grade) setGrade(userProfile.grade);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else if (!savedGuest) {
        setGrade(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGuestMode = () => {
    setIsGuest(true);
    localStorage.setItem('isGuest', 'true');
    const localGrade = localStorage.getItem('guestGrade') as Grade;
    if (localGrade) setGrade(localGrade);
  };

  const handleSetGrade = async (newGrade: Grade) => {
    setGrade(newGrade);
    if (isGuest) {
      localStorage.setItem('guestGrade', newGrade);
    } else {
      localStorage.setItem('savedGrade', newGrade);
      // Also update local profile state so we don't show selector again
      if (profile) {
        setProfile({ ...profile, grade: newGrade });
      }
    }
  };

  const handleProfileComplete = async (name: string) => {
    if (user) {
      // Re-fetch the actual profile from DB to ensure we have the most up-to-date structure
      const newProfile = await getUserProfile(user.uid);
      if (newProfile) {
        setProfile(newProfile);
        if (newProfile.grade) setGrade(newProfile.grade);
      } else {
        // Fallback if fetch fails
        setProfile({ uid: user.uid, displayName: name, grade: null });
      }
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('savedGrade');
    localStorage.removeItem('guestGrade');
    localStorage.removeItem('isGuest');
    setGrade(null);
    setProfile(null);
    if (!isGuest) {
      await logout();
    }
    setIsGuest(false);
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

  // Not logged in and not guest
  if (!user && !isGuest) {
    return <Auth onGuest={handleGuestMode} />;
  }

  // Logged in but No Profile in DB (or missing displayName)
  if (user && (!profile || !profile.displayName) && !isGuest) {
    return <ProfileSetup user={user} onComplete={handleProfileComplete} />;
  }

  const displayUser = user ? {
    id: user.uid,
    email: user.email,
    user_metadata: { 
      full_name: profile?.displayName || user.displayName || 'مستخدم',
      avatar_url: profile?.photoURL || user.photoURL 
    }
  } : { id: 'guest_user', email: null, user_metadata: { full_name: 'زائر' } };

  // Logged in but No Grade set yet
  if (!grade && !isGuest) {
    return <GradeSelector userId={displayUser.id} onComplete={handleSetGrade} />;
  }

  // Guest mode without grade
  if (isGuest && !grade) {
    return <GradeSelector userId="guest_user" onComplete={handleSetGrade} />;
  }

  return <Dashboard user={displayUser} grade={grade} onChangeGrade={() => setGrade(null)} onLogout={handleLogout} />;
}
