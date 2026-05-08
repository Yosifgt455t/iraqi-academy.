import React, { useState, useEffect } from 'react';
import { ArrowRight, Plus, Trash2, Calendar, CheckCircle2, Circle, ListTodo } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Todo {
  id: string;
  text: string;
  date: string;
  completed: boolean;
}

interface Props {
  userId: string;
  onBack: () => void;
}

export default function TodoPage({ userId, onBack }: Props) {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem(`todos_${userId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [newText, setNewText] = useState('');
  const [newDate, setNewDate] = useState(() => {
    const today = new Date();
    // Use local date formatted as YYYY-MM-DD
    return today.toLocaleDateString('en-CA'); 
  });

  useEffect(() => {
    localStorage.setItem(`todos_${userId}`, JSON.stringify(todos));
  }, [todos, userId]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !newDate) return;
    const newTask: Todo = {
      id: Date.now().toString(),
      text: newText.trim(),
      date: newDate,
      completed: false,
    };
    setTodos((prev) => [...prev, newTask].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setNewText('');
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter(t => t.id !== id));
  };

  // Group todos by date
  const groupedTodos = todos.reduce((acc, todo) => {
    if (!acc[todo.date]) acc[todo.date] = [];
    acc[todo.date].push(todo);
    return acc;
  }, {} as Record<string, Todo[]>);

  const sortedDates = Object.keys(groupedTodos).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black flex flex-col relative" dir="rtl">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '32px 32px' }} />

      {/* Header */}
      <div className="h-20 bg-white dark:bg-black border-b-4 border-black dark:border-white flex items-center shrink-0 px-4 sm:px-8 shadow-[0_4px_0_0_rgba(0,0,0,1)] dark:shadow-[0_4px_0_0_rgba(255,255,255,1)] z-30 w-full">
        <button 
          onClick={onBack}
          className="p-2 bg-white border-2 border-black rounded-xl text-black hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:neo-bg-yellow active:translate-y-0 active:shadow-none transition-all ml-4"
        >
          <ArrowRight size={24} strokeWidth={2.5} />
        </button>
        <div className="w-12 h-12 neo-bg-teal border-2 border-black rounded-xl flex items-center justify-center text-black ml-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <ListTodo size={24} strokeWidth={2.5} />
        </div>
        <h2 className="font-black text-black dark:text-white text-2xl">قائمة المهام</h2>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 relative z-10">
        <div className="max-w-3xl mx-auto space-y-10">
          
          {/* Add Task Form */}
          <motion.form 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleAdd} 
            className="bg-white dark:bg-black p-6 sm:p-8 rounded-2xl neo-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] flex flex-col sm:flex-row gap-6 items-end sm:items-center neo-bg-pink"
          >
            <div className="flex-1 w-full space-y-3">
              <label className="text-xl font-black text-black">المهمة</label>
              <input
                type="text"
                placeholder="شنو اللي تريد تنجزه؟"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="w-full bg-white neo-border px-4 py-4 outline-none focus:neo-bg-yellow focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-bold text-black"
              />
            </div>
            <div className="w-full sm:w-auto space-y-3">
              <label className="text-xl font-black text-black">التاريخ</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full sm:w-48 bg-white neo-border px-4 py-4 outline-none focus:neo-bg-yellow focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-bold text-black text-center"
              />
            </div>
            <button 
              type="submit"
              disabled={!newText.trim() || !newDate}
              className="w-full sm:w-auto mt-2 sm:mt-0 neo-bg-green border-4 border-black text-black px-8 py-4 rounded-xl font-black text-xl flex items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none bg-white"
            >
              <Plus size={24} strokeWidth={2.5} />
              <span className="sm:hidden">إضافة مهمة</span>
            </button>
          </motion.form>

          {/* Tasks List */}
          <div className="space-y-8 pb-20">
            <AnimatePresence mode="popLayout">
              {sortedDates.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-20 bg-white dark:bg-[#1a1a1a] neo-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] rounded-2xl"
                >
                  <div className="w-24 h-24 neo-bg-yellow border-4 border-black text-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-3">
                    <ListTodo size={48} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-3xl font-black text-black dark:text-white mb-4">لا توجد مهام حالياً</h3>
                  <p className="text-black/80 dark:text-white/80 text-xl font-bold">أضف مهمتك الأولى وابدأ يومك بنشاط!</p>
                </motion.div>
              )}
              {sortedDates.map(date => (
                <motion.div 
                  key={date}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 text-black dark:text-white font-black px-2 text-xl">
                    <Calendar size={24} className="text-black dark:text-white" strokeWidth={2.5} />
                    <span className="bg-white dark:bg-black border-2 border-black dark:border-white px-4 py-1 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] neo-bg-blue">{new Date(date).toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl neo-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] overflow-hidden divide-y-4 divide-black dark:divide-white text-black dark:text-white">
                    {groupedTodos[date].map(todo => (
                      <div 
                        key={todo.id} 
                        className={`p-6 flex items-center gap-6 transition-colors ${todo.completed ? 'neo-bg-pink opacity-80' : 'hover:neo-bg-yellow'}`}
                      >
                        <button 
                          onClick={() => toggleTodo(todo.id)}
                          className={`flex-shrink-0 transition-all hover:scale-110 ${todo.completed ? 'text-black' : 'text-black dark:text-white hover:text-black dark:hover:text-amber-500'}`}
                        >
                          {todo.completed ? <CheckCircle2 size={32} strokeWidth={2.5} /> : <Circle size={32} strokeWidth={2.5} />}
                        </button>
                        <span className={`flex-1 text-lg sm:text-xl font-black transition-all ${todo.completed ? 'line-through decoration-4' : ''}`}>
                          {todo.text}
                        </span>
                        <button 
                          onClick={() => deleteTodo(todo.id)}
                          className="flex-shrink-0 text-black dark:text-white bg-white dark:bg-black border-2 border-black dark:border-white p-2 hover:neo-bg-red active:translate-y-1 active:shadow-none hover:text-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                        >
                          <Trash2 size={24} strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
