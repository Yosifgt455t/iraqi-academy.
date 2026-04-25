import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface EnglishExamData {
  q1: { unseenPassage: string; questions: string[]; };
  q2: { questions: string[]; };
  q3: { 
    isTwoBranches: boolean; 
    branchA: { questions: string[]; }; 
    branchB: { type: 'brackets' | 'standard'; questions: string[]; }; 
  };
  q4: { 
    branches: { 
      id: string; // for React keys
      type: 'fill_in' | 'matching' | 'spelling' | 'punctuation';
      words?: string;
      questions?: string[];
      list1?: string;
      list2?: string;
    }[]; 
  };
  q5: { title: string; questions: string[]; };
  q6: { prompts: string[]; };
}

export const defaultEnglishExam: EnglishExamData = {
  q1: { unseenPassage: '', questions: [''] },
  q2: { questions: [''] },
  q3: { isTwoBranches: true, branchA: { questions: [''] }, branchB: { type: 'brackets', questions: [''] } },
  q4: { branches: [{ id: Date.now().toString(), type: 'fill_in', words: '', questions: [''] }] },
  q5: { title: 'Answer or complete the following questions:', questions: [''] },
  q6: { prompts: [''] }
};

const englishLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export function EnglishExamPdf({ exam }: { exam: EnglishExamData }) {
  return (
    <div 
      className="flex flex-col flex-1"
      dir="ltr"
      style={{ 
        minHeight: '700px',
        fontFamily: "'Times New Roman', Times, serif",
        fontWeight: 400,
        textAlign: 'left',
        justifyContent: 'flex-start'
      }}
    >
      <div className="text-left font-bold text-lg mb-2">Note: Answer all the questions.</div>

      <div className="space-y-0 text-[19px]">
        {/* Page 1 Wrapper */}
        <div style={{ minHeight: '940px' }} className="flex flex-col">
          {/* Q1: Reading Comprehension */}
          <div className="py-2 space-y-3">
          <div className="flex items-center justify-between mt-4 mb-2">
            <span className="font-bold text-[20px] italic">Reading Comprehension:</span>
            <span className="font-bold italic text-[19px] shrink-0">(20 Marks)</span>
          </div>
          <div className="flex items-start gap-4 mb-2">
            <span className="text-xl font-bold shrink-0">Q1. A/</span>
            <p className="leading-[1.4] flex-1 font-semibold">Read this text carefully then answer the questions:</p>
          </div>
          <div className="mx-10 border border-slate-400 p-4 mb-4 rounded italic font-medium leading-[1.6]">
            {exam.q1.unseenPassage || '......................................................................'}
          </div>
          <div className="ml-12 space-y-3">
            {exam.q1.questions.map((q, i) => (
              <div key={i} className="flex gap-4">
                <span className="font-bold shrink-0">{i + 1}.</span>
                <p className="flex-1 font-semibold">{q}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Q2: Textbook Passages */}
        <div className="py-2 space-y-3">
          <div className="flex items-center justify-between mt-4 mb-2">
            <span className="font-bold text-[20px] italic">Textbook Passages:</span>
            <span className="font-bold italic text-[19px] shrink-0">(10 Marks)</span>
          </div>
          <div className="flex items-start gap-4 mb-2">
            <span className="text-xl font-bold shrink-0">Q2.</span>
            <p className="leading-[1.4] flex-1 font-semibold">Answer or complete the following sentences using information from your textbook:</p>
          </div>
          <div className="ml-12 space-y-3">
            {exam.q2.questions.map((q, i) => (
              <div key={i} className="flex gap-4">
                <span className="font-bold shrink-0">{i + 1}.</span>
                <p className="flex-1 font-semibold">{q}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Q3: Grammar */}
        <div className="py-2 space-y-3">
          <div className="flex items-center justify-between mt-4 mb-2">
            <span className="font-bold text-[20px] italic">Grammar and Functions:</span>
            <span className="font-bold italic text-[19px] shrink-0">(30 Marks)</span>
          </div>
          {exam.q3.isTwoBranches ? (
            <>
              <div className="flex items-start gap-4 mb-2">
                <span className="text-xl font-bold shrink-0">Q3. A/</span>
                <p className="leading-[1.4] flex-1 font-semibold">Re-write the following sentences, follow the instructions between brackets.</p>
              </div>
              <div className="ml-12 space-y-3 mb-4">
                {exam.q3.branchA.questions.map((q, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="font-bold shrink-0">{i + 1}.</span>
                    <p className="flex-1 font-semibold">{q}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-4 mb-2">
                <span className="text-xl font-bold shrink-0">B/</span>
                <p className="leading-[1.4] flex-1 font-semibold">
                  {exam.q3.branchB.type === 'brackets' ? 'Choose the correct word between brackets:' : 'Do as required:'}
                </p>
              </div>
              <div className="ml-12 space-y-3">
                {exam.q3.branchB.questions.map((q, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="font-bold shrink-0">{i + 1}.</span>
                    <p className="flex-1 font-semibold">{q}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-4 mb-2">
                <span className="text-xl font-bold shrink-0">Q3.</span>
                <p className="leading-[1.4] flex-1 font-semibold">Re-write the following sentences, follow the instructions between brackets.</p>
              </div>
              <div className="ml-12 space-y-3">
                {exam.q3.branchA.questions.map((q, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="font-bold shrink-0">{i + 1}.</span>
                    <p className="flex-1 font-semibold">{q}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        </div>

        {/* Q4: Vocab */}
        <div className="py-2 space-y-3">
          <div className="flex items-center justify-between mt-4 mb-2">
            <span className="font-bold text-[20px] italic">Vocabulary and Spelling:</span>
            <span className="font-bold italic text-[19px] shrink-0">(20 Marks)</span>
          </div>
          <div className="flex items-start gap-4 mb-2">
            <span className="text-xl font-bold shrink-0">Q4.</span>
          </div>
          {exam.q4.branches.map((br, bIdx) => {
            const label = englishLabels[bIdx] + '/';
            return (
              <div key={br.id} className="mb-4">
                {br.type === 'fill_in' && (
                  <>
                    <div className="flex items-start gap-4 mb-2">
                      <span className="text-xl font-bold shrink-0 ml-4">{label}</span>
                      <p className="leading-[1.4] flex-1 font-semibold text-[19px]">Complete each sentence with the suitable word from the box:</p>
                    </div>
                    <div className="border-[2px] border-black rounded-lg p-3 mx-8 mb-4 text-center font-bold text-xl tracking-wider shadow-sm">
                      {br.words?.split(',').map(w => w.trim()).filter(Boolean).join('   ,   ') || '......'}
                    </div>
                    <div className="ml-12 space-y-3">
                      {br.questions?.map((q, i) => (
                        <div key={i} className="flex gap-4">
                          <span className="font-bold shrink-0">{i + 1}.</span>
                          <p className="flex-1 font-semibold">{q}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {br.type === 'matching' && (
                  <>
                    <div className="flex items-start gap-4 mb-2">
                      <span className="text-xl font-bold shrink-0 ml-4">{label}</span>
                      <p className="leading-[1.4] flex-1 font-semibold text-[19px]">Match the words in List A with List B:</p>
                    </div>
                    <div className="flex gap-8 justify-center mb-4 px-12">
                      <div className="min-w-[200px] flex-1">
                        <p className="font-bold mb-2 text-left italic">List A :</p>
                        {(br.list1 || '').split('\n').filter(Boolean).map((item, i) => (
                          <div key={i} className="mb-2 flex gap-2 font-semibold">
                            <span className="w-8 shrink-0 text-left">{i + 1}.</span> <span>{item}</span>
                          </div>
                        ))}
                      </div>
                      <div className="min-w-[200px] flex-1">
                        <p className="font-bold mb-2 text-left italic">List B :</p>
                        {(br.list2 || '').split('\n').filter(Boolean).map((item, i) => (
                          <div key={i} className="mb-2 flex gap-2 font-semibold">
                            <span className="w-8 shrink-0 text-left">{englishLabels[i].toLowerCase() + '.'}</span> <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {br.type === 'spelling' && (
                  <>
                    <div className="flex items-start gap-4 mb-2">
                      <span className="text-xl font-bold shrink-0 ml-4">{label}</span>
                      <p className="leading-[1.4] flex-1 font-semibold text-[19px]">Complete the following with correctly spelt words:</p>
                    </div>
                    <div className="ml-12 space-y-3">
                      {br.questions?.map((q, i) => (
                        <div key={i} className="flex gap-4">
                          <span className="font-bold shrink-0">{i + 1}.</span>
                          <p className="flex-1 font-semibold">{q}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {br.type === 'punctuation' && (
                  <>
                    <div className="flex items-start gap-4 mb-2">
                      <span className="text-xl font-bold shrink-0 ml-4">{label}</span>
                      <p className="leading-[1.4] flex-1 font-semibold text-[19px]">Re-write the following using correct punctuation:</p>
                    </div>
                    <div className="ml-12 space-y-3">
                      {br.questions?.map((q, i) => (
                        <div key={i} className="flex gap-4">
                          <span className="font-bold shrink-0">{i + 1}.</span>
                          <p className="flex-1 font-semibold">{q}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Q5: Literature */}
        <div className="py-2 space-y-3">
          <div className="flex items-center justify-between mt-4 mb-2">
            <span className="font-bold text-[20px] italic">Literature Focus:</span>
            <span className="font-bold italic text-[19px] shrink-0">(10 Marks)</span>
          </div>
          <div className="flex items-start gap-4 mb-2">
            <span className="text-xl font-bold shrink-0">Q5.</span>
            <p className="leading-[1.4] flex-1 font-semibold">{exam.q5.title || 'Answer or complete the following questions:'}</p>
          </div>
          <div className="ml-12 space-y-3">
            {exam.q5.questions.map((q, i) => (
              <div key={i} className="flex gap-4">
                <span className="font-bold shrink-0">{i + 1}.</span>
                <p className="flex-1 font-semibold">{q}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Q6: Writing */}
        <div className="py-2 space-y-3">
          <div className="flex items-center justify-between mt-4 mb-2">
            <span className="font-bold text-[20px] italic">Writing:</span>
            <span className="font-bold italic text-[19px] shrink-0">(20 Marks)</span>
          </div>
          <div className="flex items-start gap-4 mb-2">
            <span className="text-xl font-bold shrink-0">Q6.</span>
            {exam.q6.prompts.length > 1 ? (
              <p className="leading-[1.4] flex-1 font-semibold">Choose either A or B.</p>
            ) : (
              <p className="leading-[1.4] flex-1 font-semibold">Write an essay on the following topic:</p>
            )}
          </div>
          <div className="ml-12 space-y-3 mt-2">
            {exam.q6.prompts.map((p, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="font-bold shrink-0 text-[19px]">{englishLabels[i]}/</span>
                <p className="flex-1 font-semibold">{p}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export function EnglishExamEditor({ exam, setExam }: { exam: EnglishExamData; setExam: React.Dispatch<React.SetStateAction<EnglishExamData>> }) {
  const updateExam = (updateFn: (draft: EnglishExamData) => void) => {
    setExam(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      updateFn(copy);
      return copy;
    });
  };

  return (
    <div className="space-y-6" dir="ltr">
      {/* Q1: Reading */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 shadow-sm">
        <h4 className="font-bold text-slate-800 text-lg border-l-4 border-blue-500 pl-2">Q1: Reading Comprehension</h4>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Unseen Passage Text</label>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              rows={4}
              value={exam.q1.unseenPassage}
              onChange={(e) => updateExam(d => { d.q1.unseenPassage = e.target.value; })}
              placeholder="Paste the passage here..."
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Questions (Branch A)</label>
            {exam.q1.questions.map((q, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <span className="font-bold text-slate-400 self-center">{i + 1}.</span>
                <input
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                  value={q}
                  onChange={(e) => updateExam(d => { d.q1.questions[i] = e.target.value; })}
                />
                <button
                  onClick={() => updateExam(d => { d.q1.questions.splice(i, 1); })}
                  className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => updateExam(d => { d.q1.questions.push(''); })}
              className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800"
            >
              <Plus size={14} /> Add Question
            </button>
          </div>
        </div>
      </div>

      {/* Q2: Textbook */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 shadow-sm">
        <h4 className="font-bold text-slate-800 text-lg border-l-4 border-blue-500 pl-2">Q2: Textbook Passages</h4>
        <div className="space-y-3">
          {exam.q2.questions.map((q, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <span className="font-bold text-slate-400 self-center">{i + 1}.</span>
              <input
                className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                value={q}
                onChange={(e) => updateExam(d => { d.q2.questions[i] = e.target.value; })}
              />
              <button
                onClick={() => updateExam(d => { d.q2.questions.splice(i, 1); })}
                className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            onClick={() => updateExam(d => { d.q2.questions.push(''); })}
            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800"
          >
            <Plus size={14} /> Add Question
          </button>
        </div>
      </div>

      {/* Q3: Grammar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 text-lg border-l-4 border-blue-500 pl-2">Q3: Grammar and Functions</h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={exam.q3.isTwoBranches}
              onChange={(e) => updateExam(d => { d.q3.isTwoBranches = e.target.checked; })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm font-semibold text-slate-600">Enable Two Branches (A & B)</span>
          </label>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h5 className="font-bold text-slate-700 mb-2">Branch A (Re-write)</h5>
            {exam.q3.branchA.questions.map((q, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <span className="font-bold text-slate-400 self-center">{i + 1}.</span>
                <input
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                  value={q}
                  onChange={(e) => updateExam(d => { d.q3.branchA.questions[i] = e.target.value; })}
                />
                <button
                  onClick={() => updateExam(d => { d.q3.branchA.questions.splice(i, 1); })}
                  className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => updateExam(d => { d.q3.branchA.questions.push(''); })}
              className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800"
            >
              <Plus size={14} /> Add Question
            </button>
          </div>

          {exam.q3.isTwoBranches && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-bold text-slate-700">Branch B Type</h5>
                <select 
                  value={exam.q3.branchB.type}
                  onChange={(e) => updateExam(d => { d.q3.branchB.type = e.target.value as any; })}
                  className="border border-slate-200 rounded-lg p-1 text-sm bg-white"
                >
                  <option value="brackets">Choose between brackets</option>
                  <option value="standard">Normal / Do as required</option>
                </select>
              </div>
              {exam.q3.branchB.questions.map((q, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <span className="font-bold text-slate-400 self-center">{i + 1}.</span>
                  <input
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                    value={q}
                    onChange={(e) => updateExam(d => { d.q3.branchB.questions[i] = e.target.value; })}
                  />
                  <button
                    onClick={() => updateExam(d => { d.q3.branchB.questions.splice(i, 1); })}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => updateExam(d => { d.q3.branchB.questions.push(''); })}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800"
              >
                <Plus size={14} /> Add Question
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Q4: Vocabulary and Spelling */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 text-lg border-l-4 border-blue-500 pl-2">Q4: Vocabulary & Spelling</h4>
          <button
            onClick={() => updateExam(d => { d.q4.branches.push({ id: Date.now().toString(), type: 'spelling', questions: [''] }); })}
            className="flex items-center gap-1 text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> Add Branch
          </button>
        </div>

        <div className="space-y-4">
          {exam.q4.branches.map((br, bIdx) => (
            <div key={br.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative group">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-sm">Branch {englishLabels[bIdx]}</span>
                <div className="flex items-center gap-3">
                  <select
                    value={br.type}
                    onChange={(e) => updateExam(d => { d.q4.branches[bIdx].type = e.target.value as any; })}
                    className="border border-slate-200 rounded-lg p-1 text-sm bg-white"
                  >
                    <option value="fill_in">Fill in the Blanks</option>
                    <option value="matching">Matching</option>
                    <option value="spelling">Spelling</option>
                    <option value="punctuation">Punctuation</option>
                  </select>
                  <button onClick={() => updateExam(d => { d.q4.branches.splice(bIdx, 1); })} className="text-red-500 hover:bg-red-50 p-1 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {br.type === 'fill_in' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Words inside the box (comma separated)</label>
                    <input
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                      value={br.words || ''}
                      onChange={(e) => updateExam(d => { d.q4.branches[bIdx].words = e.target.value; })}
                      placeholder="apple, banana, cherry..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Sentences</label>
                    {br.questions?.map((q, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input
                          className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                          value={q}
                          onChange={(e) => updateExam(d => { d.q4.branches[bIdx].questions![i] = e.target.value; })}
                        />
                        <button onClick={() => updateExam(d => { d.q4.branches[bIdx].questions!.splice(i, 1); })} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    ))}
                    <button onClick={() => updateExam(d => { d.q4.branches[bIdx].questions!.push(''); })} className="flex items-center gap-1 text-[10px] font-bold text-blue-600"><Plus size={14} /> Add Sentence</button>
                  </div>
                </div>
              )}

              {br.type === 'matching' && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 block mb-1">List A (Enter 1 per line)</label>
                    <textarea
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                      rows={5}
                      value={br.list1 || ''}
                      onChange={(e) => updateExam(d => { d.q4.branches[bIdx].list1 = e.target.value; })}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 block mb-1">List B (Enter 1 per line)</label>
                    <textarea
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                      rows={5}
                      value={br.list2 || ''}
                      onChange={(e) => updateExam(d => { d.q4.branches[bIdx].list2 = e.target.value; })}
                    />
                  </div>
                </div>
              )}

              {(br.type === 'spelling' || br.type === 'punctuation') && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 block mb-1">Items / Words</label>
                  {br.questions?.map((q, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                        value={q}
                        onChange={(e) => updateExam(d => { d.q4.branches[bIdx].questions![i] = e.target.value; })}
                        placeholder={br.type === 'spelling' ? 'play, playing; go, .....' : 'he goes to baghdad on monday...'}
                      />
                      <button onClick={() => updateExam(d => { d.q4.branches[bIdx].questions!.splice(i, 1); })} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  <button onClick={() => updateExam(d => { d.q4.branches[bIdx].questions!.push(''); })} className="flex items-center gap-1 text-[10px] font-bold text-blue-600"><Plus size={14} /> Add Item</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Q5: Literature Focus */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 shadow-sm">
        <h4 className="font-bold text-slate-800 text-lg border-l-4 border-blue-500 pl-2">Q5: Literature Focus</h4>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Question Prompt</label>
            <input
              className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
              value={exam.q5.title}
              onChange={(e) => updateExam(d => { d.q5.title = e.target.value; })}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Questions</label>
            {exam.q5.questions.map((q, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <span className="font-bold text-slate-400 self-center">{i + 1}.</span>
                <input
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                  value={q}
                  onChange={(e) => updateExam(d => { d.q5.questions[i] = e.target.value; })}
                />
                <button onClick={() => updateExam(d => { d.q5.questions.splice(i, 1); })} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
              </div>
            ))}
            <button onClick={() => updateExam(d => { d.q5.questions.push(''); })} className="flex items-center gap-1 text-[10px] font-bold text-blue-600"><Plus size={14} /> Add Question</button>
          </div>
        </div>
      </div>

      {/* Q6: Writing */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 shadow-sm">
        <h4 className="font-bold text-slate-800 text-lg border-l-4 border-blue-500 pl-2">Q6: Writing</h4>
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-500 block mb-1">Essay Prompts (Add 2 to show "Choose A or B")</label>
          {exam.q6.prompts.map((q, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <span className="font-bold text-slate-400 self-center">{englishLabels[i]}/</span>
              <textarea
                className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                rows={2}
                value={q}
                onChange={(e) => updateExam(d => { d.q6.prompts[i] = e.target.value; })}
              />
              <button onClick={() => updateExam(d => { d.q6.prompts.splice(i, 1); })} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
            </div>
          ))}
          <button onClick={() => updateExam(d => { d.q6.prompts.push(''); })} className="flex items-center gap-1 text-[10px] font-bold text-blue-600"><Plus size={14} /> Add Writing Prompt</button>
        </div>
      </div>

    </div>
  );
}
