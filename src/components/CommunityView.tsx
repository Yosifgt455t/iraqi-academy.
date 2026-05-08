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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 neo-bg-pink p-8 border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="text-right">
          <h2 className="text-3xl font-black text-black">منتدى المجتمع 💬</h2>
          <p className="text-black/80 font-bold text-lg mt-2">شارك، اسأل، وناقش مع زملائك من كل أنحاء العراق</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-3 bg-white border-2 border-black text-black px-6 py-4 rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-lg"
        >
          <Plus size={24} />
          <span>منشور جديد</span>
        </button>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-black dark:text-white" size={40} />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 space-y-6 bg-white dark:bg-black neo-border neo-bg-yellow p-8">
             <div className="w-24 h-24 bg-white border-4 border-black text-black rounded-full flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
               <MessageSquare size={40} />
             </div>
             <p className="text-black font-black text-xl">لا يوجد منشورات حالياً، كن أول من ينشر!</p>
          </div>
        ) : (
          posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#1a1a1a] neo-border hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-all cursor-pointer group"
              onClick={() => {
                setSelectedPost(post);
                fetchComments(post.id);
              }}
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                    {post.authorPhoto ? (
                      <img src={post.authorPhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-black bg-slate-100">
                        <UserIcon size={24} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h5 className="font-black text-black dark:text-white text-lg">{post.authorName}</h5>
                    <p className="text-sm text-black/60 dark:text-white/60 font-bold">{new Date(post.createdAt).toLocaleDateString('ar-IQ')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-2xl font-black text-black dark:text-white leading-tight group-hover:text-amber-500 transition-colors">
                    {post.title}
                  </h4>
                  <p className="text-black/80 dark:text-white/80 text-base font-bold line-clamp-3 leading-relaxed">
                    {post.content}
                  </p>
                </div>

                <div className="pt-6 border-t-2 border-black dark:border-white flex items-center gap-8">
                  <button 
                    onClick={(e) => handleLike(post.id, e)}
                    className={`flex items-center gap-2 transition-colors border-2 border-black dark:border-white px-4 py-2 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 active:translate-y-0 active:shadow-none ${post.likedBy?.includes(user.id || user.uid) ? 'neo-bg-teal text-black' : 'bg-white dark:bg-black text-black dark:text-white hover:neo-bg-yellow hover:text-black dark:hover:text-white'}`}
                  >
                    <ThumbsUp size={20} className={`${post.likedBy?.includes(user.id || user.uid) ? 'fill-current' : ''}`} />
                    <span className="text-sm font-black">{post.likes || 0}</span>
                  </button>
                  <div className="flex items-center gap-2 text-black dark:text-white bg-slate-50 dark:bg-slate-800 border-2 border-black dark:border-white px-4 py-2 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                    <MessageSquare size={20} />
                    <span className="text-sm font-black">{post.commentCount || 0}</span>
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
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-xl rounded-2xl neo-border overflow-hidden"
            >
              <div className="p-6 neo-bg-yellow border-b-2 border-black dark:border-white flex items-center justify-between">
                <h3 className="text-2xl font-black text-black">إنشاء منشور جديد</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 bg-white border-2 border-black rounded-xl text-black hover:neo-bg-red hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <X />
                </button>
              </div>
              <form onSubmit={handleCreatePost} className="p-6 space-y-6">
                <input
                  type="text"
                  placeholder="عنوان المنشور..."
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full p-4 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl outline-none focus:neo-border font-black text-lg dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                  required
                />
                <textarea
                  placeholder="ما الذي يدور في ذهنك؟"
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full p-4 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl outline-none focus:neo-border min-h-[150px] resize-none font-bold text-lg dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                  required
                />
                <div className="flex justify-end gap-4 pt-4">
                   <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-8 py-3 bg-white border-2 border-black text-black rounded-xl font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                   >
                     إلغاء
                   </button>
                   <button 
                    type="submit"
                    disabled={submitting}
                    className="px-10 py-3 neo-bg-teal border-2 border-black text-black rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                   >
                     {submitting ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
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
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-2xl rounded-2xl neo-border flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b-2 border-black dark:border-white flex items-center justify-between flex-shrink-0 neo-bg-yellow">
                <button onClick={() => setSelectedPost(null)} className="p-2 bg-white border-2 border-black rounded-xl text-black hover:neo-bg-red hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <X />
                </button>
                <h3 className="text-2xl font-black text-black">تفاصيل المنشور</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10">
                 <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                        {selectedPost.authorPhoto ? (
                          <img src={selectedPost.authorPhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-black bg-slate-100">
                            <UserIcon size={32} />
                          </div>
                        )}
                      </div>
                      <div>
                        <h5 className="font-black text-black dark:text-white text-xl">{selectedPost.authorName}</h5>
                        <p className="text-sm text-black/60 dark:text-white/60 font-bold mt-1">{new Date(selectedPost.createdAt).toLocaleString('ar-IQ')}</p>
                      </div>
                    </div>
                    <h2 className="text-4xl font-black text-black dark:text-white leading-tight">{selectedPost.title}</h2>
                    <p className="text-black/80 dark:text-white/80 leading-relaxed font-bold text-lg whitespace-pre-wrap">{selectedPost.content}</p>
                 </div>

                 <div className="space-y-8">
                    <h4 className="font-black text-black dark:text-white border-b-2 border-black dark:border-white pb-4 flex items-center gap-3 text-2xl">
                       <MessageSquare size={28} />
                       <span>التعليقات ({comments.length})</span>
                    </h4>

                    {loadingComments ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-black dark:text-white" size={40} />
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="bg-white dark:bg-black border-2 border-black dark:border-white p-6 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                        <p className="text-center font-black text-black dark:text-white text-lg">لا يوجد تعليقات بعد. كن أول من يترك بصمة!</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {comments.map((comment, idx) => (
                          <motion.div 
                            key={comment.id} 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex gap-4"
                          >
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border-2 border-black dark:border-white flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                               {comment.authorPhoto ? (
                                 <img src={comment.authorPhoto} alt="" className="w-full h-full object-cover" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center text-black bg-slate-100">
                                   <UserIcon size={24} />
                                 </div>
                               )}
                            </div>
                            <div className="bg-white dark:bg-black p-6 rounded-2xl border-2 border-black dark:border-white flex-1 space-y-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                               <div className="flex items-center justify-between">
                                 <span className="font-black text-black dark:text-white text-lg">{comment.authorName}</span>
                                 <span className="text-xs font-bold text-black/60 dark:text-white/60 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-black dark:border-white">{new Date(comment.createdAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}</span>
                               </div>
                               <p className="text-base text-black/80 dark:text-white/80 font-bold leading-relaxed">{comment.content}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                 </div>
              </div>

              <div className="p-6 border-t-2 border-black dark:border-white flex-shrink-0 bg-white dark:bg-black">
                <form onSubmit={handleAddComment} className="flex gap-4">
                  <input 
                    type="text"
                    placeholder="اكتب تعليقك..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 p-4 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl outline-none focus:neo-border text-lg font-bold dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                  />
                  <button 
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="w-16 h-16 neo-bg-teal border-2 border-black text-black rounded-xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={28} /> : <Send size={28} />}
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
