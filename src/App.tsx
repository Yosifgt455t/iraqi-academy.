import { useState, useEffect } from 'react';
import { auth, logout, getUserProfile, subscribeToMaintenanceMode } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Grade } from './types';
import Auth from './components/Auth';
import ProfileSetup from './components/ProfileSetup';
import GradeSelector from './components/GradeSelector';
import Dashboard from './components/Dashboard';
import { Loader2, Wrench, Instagram } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Maintenance Mode Subscription
    const unsubMaintenance = subscribeToMaintenanceMode((active) => {
      setIsMaintenanceActive(active);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Dynamic Admin Check (Quick check for Super Admin to avoid flash)
        const isSuperAdmin = firebaseUser.email?.toLowerCase() === 'jwjwjwjueue@gmail.com'.toLowerCase();
        if (isSuperAdmin) {
          setIsAdmin(true);
        }

        import('./services/adminService').then(({ checkIsAdmin }) => {
          checkIsAdmin(firebaseUser.email).then(setIsAdmin);
        });
        
        try {
          const userProfile = await getUserProfile(firebaseUser.uid);
          if (userProfile) {
            setProfile(userProfile);
            if (userProfile.grade) setGrade(userProfile.grade);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        setGrade(null);
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubMaintenance();
    };
  }, []);

  const handleSetGrade = async (newGrade: Grade) => {
    setGrade(newGrade);
    localStorage.setItem('savedGrade', newGrade);
    // Also update local profile state so we don't show selector again
    if (profile) {
      setProfile({ ...profile, grade: newGrade });
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
    await logout();
  };

  const renderContent = () => {
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
    if (!user) {
      return <Auth onGuest={() => {}} />;
    }

    // Maintenance Mode (Blocks non-admins after they've had a chance to log in)
    if (isMaintenanceActive && !isAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white p-6 text-center" dir="rtl">
          <div className="max-w-md space-y-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-24 h-24 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-8 shadow-sm shadow-amber-100/50"
            >
              <Wrench size={48} />
            </motion.div>
            <div className="space-y-4">
              <h1 className="text-4xl font-black text-slate-900 leading-tight">المنصة في وضع الصيانة</h1>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">
                نحن نقوم الآن ببعض التحديثات والتحسينات لنقدم لكم تجربة أفضل. 
                سنعود للعمل قريباً جداً، شكراً لصبركم!
              </p>
            </div>
            <div className="pt-8">
              <button 
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-12 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-md shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
              >
                تحديث الصفحة
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Logged in but No Profile in DB (or missing displayName)
    if (user && (!profile || !profile.displayName)) {
      return <ProfileSetup user={user} onComplete={handleProfileComplete} />;
    }

    const displayUser = {
      id: user!.uid,
      email: user!.email,
      displayName: profile?.displayName || user!.displayName || 'مستخدم',
      photoURL: profile?.photoURL || user!.photoURL,
      user_metadata: { 
        full_name: profile?.displayName || user!.displayName || 'مستخدم',
        avatar_url: profile?.photoURL || user!.photoURL 
      }
    };

    // Logged in but No Grade set yet
    if (!grade) {
      return <GradeSelector userId={displayUser.id} onComplete={handleSetGrade} />;
    }

    // Guest mode without grade

    return (
      <Dashboard 
        user={displayUser} 
        grade={grade} 
        isAdmin={isAdmin}
        onChangeGrade={() => setGrade(null)} 
        onLogout={handleLogout} 
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex-1">
        {renderContent()}
      </div>
      
      {/* Global Footer */}
      <footer className="py-4 px-4 text-center border-t-4 border-black dark:border-white bg-[#FFB5A7] neo-border-t" dir="rtl">
        <div className="max-w-md mx-auto flex flex-col items-center gap-2">
          <p className="text-xs text-black/80 font-black font-mono tracking-wider uppercase">
            © {new Date().getFullYear()} IRAQI ACADEMY • ALL RIGHTS RESERVED
          </p>
        </div>
      </footer>
    </div>
  );
}
