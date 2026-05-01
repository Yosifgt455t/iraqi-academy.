import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ForumPost, ForumComment, Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, ThumbsUp, Send, User as UserIcon, Loader2, Plus, X, Image as ImageIcon, Search } from 'lucide-react';

interface Props {
  user: any;
}

export default function CommunityView({ user }: Props) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'forum_posts'), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ForumPost));
      setPosts(list);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'forum_posts'), {
        authorId: user.id || user.uid,
        authorName: user.displayName || user.email?.split('@')[0],
        authorPhoto: user.photoURL,
        title: newPost.title,
        content: newPost.content,
        likes: 0,
        likedBy: [],
        commentCount: 0,
        createdAt: new Date().toISOString()
      });
      setNewPost({ title: '', content: '' });
      setShowCreateModal(false);
      fetchPosts();
    } catch (err) {
      console.error('Error creating post:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchComments = async (postId: string) => {
    setLoadingComments(true);
    try {
      const q = query(collection(db, 'forum_comments'), orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);
      const list = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ForumComment))
        .filter(c => c.postId === postId);
      setComments(list);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedPost) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'forum_comments'), {
        postId: selectedPost.id,
        authorId: user.id || user.uid,
        authorName: user.displayName || user.email?.split('@')[0],
        authorPhoto: user.photoURL,
        content: newComment,
        createdAt: new Date().toISOString()
      });
      
      // Update comment count
      await updateDoc(doc(db, 'forum_posts', selectedPost.id), {
        commentCount: increment(1)
      });
      
      setNewComment('');
      fetchComments(selectedPost.id);
      
      // Update local state for the post in list
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, commentCount: p.commentCount + 1 } : p));
    } catch (err) {
      console.error('Error creating comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const userId = user.id || user.uid;
    const hasLiked = post.likedBy?.includes(userId);

    try {
      if (hasLiked) {
        await updateDoc(doc(db, 'forum_posts', postId), {
          likes: increment(-1),
          likedBy: arrayRemove(userId)
        });
        setPosts(prev => prev.map(p => p.id === postId ? { 
          ...p, 
          likes: Math.max(0, p.likes - 1), 
          likedBy: (p.likedBy || []).filter(id => id !== userId) 
        } : p));
      } else {
        await updateDoc(doc(db, 'forum_posts', postId), {
          likes: increment(1),
          likedBy: arrayUnion(userId)
        });
        setPosts(prev => prev.map(p => p.id === postId ? { 
          ...p, 
          likes: p.likes + 1, 
          likedBy: [...(p.likedBy || []), userId] 
        } : p));
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500" dir="rtl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-900">منتدى المجتمع 💬</h2>
          <p className="text-slate-500 text-sm">شارك، اسأل، وناقش مع زملائك من كل أنحاء العراق</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all hover:scale-105"
        >
          <Plus size={20} />
          <span>منشور جديد</span>
        </button>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={40} />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 space-y-4">
             <div className="w-20 h-20 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto">
               <MessageSquare size={40} />
             </div>
             <p className="text-slate-400 font-bold">لا يوجد منشورات حالياً، كن أول من ينشر!</p>
          </div>
        ) : (
          posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer"
              onClick={() => {
                setSelectedPost(post);
                fetchComments(post.id);
              }}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 dark:border-slate-800">
                    {post.authorPhoto ? (
                      <img src={post.authorPhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 dark:bg-slate-800">
                        <UserIcon size={20} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">{post.authorName}</h5>
                    <p className="text-[10px] text-slate-400 font-bold">{new Date(post.createdAt).toLocaleDateString('ar-IQ')}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors">
                    {post.title}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed">
                    {post.content}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center gap-6">
                  <button 
                    onClick={(e) => handleLike(post.id, e)}
                    className={`flex items-center gap-1.5 transition-colors group ${post.likedBy?.includes(user.id || user.uid) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'}`}
                  >
                    <ThumbsUp size={18} className={`group-hover:scale-110 transition-transform ${post.likedBy?.includes(user.id || user.uid) ? 'fill-current' : ''}`} />
                    <span className="text-xs font-black">{post.likes || 0}</span>
                  </button>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MessageSquare size={18} />
                    <span className="text-xs font-black">{post.commentCount || 0}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">إنشاء منشور جديد</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                  <X className="dark:text-white" />
                </button>
              </div>
              <form onSubmit={handleCreatePost} className="p-6 space-y-4">
                <input
                  type="text"
                  placeholder="عنوان المنشور..."
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold dark:text-white"
                  required
                />
                <textarea
                  placeholder="ما الذي يدور في ذهنك؟"
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px] resize-none font-medium dark:text-white"
                  required
                />
                <div className="flex justify-end gap-3 pt-2">
                   <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-3 text-slate-500 font-bold"
                   >
                     إلغاء
                   </button>
                   <button 
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 transition-all"
                   >
                     {submitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                     <span>نشر الآن</span>
                   </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                <button onClick={() => setSelectedPost(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                  <X className="dark:text-white" />
                </button>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">تفاصيل المنشور</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                        {selectedPost.authorPhoto ? (
                          <img src={selectedPost.authorPhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <UserIcon size={24} />
                          </div>
                        )}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white">{selectedPost.authorName}</h5>
                        <p className="text-xs text-slate-400 font-bold">{new Date(selectedPost.createdAt).toLocaleString('ar-IQ')}</p>
                      </div>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{selectedPost.title}</h2>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">{selectedPost.content}</p>
                 </div>

                 <div className="space-y-6">
                    <h4 className="font-black text-slate-900 dark:text-white border-b border-slate-50 dark:border-slate-800 pb-2 flex items-center gap-2">
                       <MessageSquare size={18} className="text-blue-500" />
                       <span>التعليقات ({comments.length})</span>
                    </h4>

                    {loadingComments ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="animate-spin text-blue-400" size={30} />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-center py-8 text-slate-400 text-sm font-bold italic">لا يوجد تعليقات بعد. كن أول من يترك بصمة!</p>
                    ) : (
                      <div className="space-y-4">
                        {comments.map((comment, idx) => (
                          <motion.div 
                            key={comment.id} 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex gap-3"
                          >
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex-shrink-0">
                               {comment.authorPhoto ? (
                                 <img src={comment.authorPhoto} alt="" className="w-full h-full object-cover" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center text-slate-300">
                                   <UserIcon size={16} />
                                 </div>
                               )}
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex-1 space-y-1">
                               <div className="flex items-center justify-between">
                                 <span className="text-xs font-black text-slate-900 dark:text-white">{comment.authorName}</span>
                                 <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}</span>
                               </div>
                               <p className="text-sm text-slate-700 dark:text-slate-400 leading-relaxed">{comment.content}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                 </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-900">
                <form onSubmit={handleAddComment} className="flex gap-3">
                  <input 
                    type="text"
                    placeholder="اكتب تعليقك..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white"
                  />
                  <button 
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
