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
    <div className="h-[100dvh] w-full bg-slate-50 flex flex-col relative" dir="rtl">
      {/* Header */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center shrink-0 px-3 sm:px-6 shadow-sm z-30 w-full">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors ml-4"
        >
          <ArrowRight size={20} />
        </button>
        <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 ml-3">
          <ListTodo size={18} />
        </div>
        <h2 className="font-bold text-slate-900 text-lg">قائمة المهام (To-Do)</h2>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          
          {/* Add Task Form */}
          <motion.form 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleAdd} 
            className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-end sm:items-center"
          >
            <div className="flex-1 w-full space-y-2">
              <label className="text-sm font-bold text-slate-700">المهمة</label>
              <input
                type="text"
                placeholder="شنو اللي تريد تنجزه؟"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
              />
            </div>
            <div className="w-full sm:w-auto space-y-2">
              <label className="text-sm font-bold text-slate-700">التاريخ</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full sm:w-40 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
              />
            </div>
            <button 
              type="submit"
              disabled={!newText.trim() || !newDate}
              className="w-full sm:w-auto mt-2 sm:mt-0 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-200"
            >
              <Plus size={20} />
              <span className="sm:hidden">إضافة مهمة</span>
            </button>
          </motion.form>

          {/* Tasks List */}
          <div className="space-y-6 pb-20">
            <AnimatePresence mode="popLayout">
              {sortedDates.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-16"
                >
                  <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ListTodo size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-700 mb-2">ما عندك أي مهام حالياً</h3>
                  <p className="text-slate-500 text-sm">ضيف مهمتك الأولى وابدأ يومك بإنجاز!</p>
                </motion.div>
              )}
              {sortedDates.map(date => (
                <motion.div 
                  key={date}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 text-slate-800 font-bold px-2">
                    <Calendar size={18} className="text-emerald-500" />
                    <span>{new Date(date).toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                    {groupedTodos[date].map(todo => (
                      <div 
                        key={todo.id} 
                        className={`p-4 flex items-center gap-4 transition-colors hover:bg-slate-50 ${todo.completed ? 'bg-slate-50/50' : ''}`}
                      >
                        <button 
                          onClick={() => toggleTodo(todo.id)}
                          className={`flex-shrink-0 transition-colors ${todo.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}`}
                        >
                          {todo.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                        </button>
                        <span className={`flex-1 text-sm sm:text-base transition-all ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-800 font-medium'}`}>
                          {todo.text}
                        </span>
                        <button 
                          onClick={() => deleteTodo(todo.id)}
                          className="flex-shrink-0 text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
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
