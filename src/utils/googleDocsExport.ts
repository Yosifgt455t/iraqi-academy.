import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// In-memory access token cache, following safety guidelines
let cachedAccessToken: string | null = null;

/**
 * Perform sign-in with Google to obtain permissions for Google Docs & Google Drive
 */
export const signInForGoogleDocs = async (): Promise<string> => {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/documents');
  provider.addScope('https://www.googleapis.com/auth/drive.file');

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential || !credential.accessToken) {
      throw new Error('لم يتم استرجاع رمز الوصول من جوجل (AccessToken missing)');
    }
    cachedAccessToken = credential.accessToken;
    return cachedAccessToken;
  } catch (error) {
    console.error('Error signing in for Google Docs:', error);
    throw error;
  }
};

/**
 * Reset cached token on sign out
 */
export const clearDocsToken = () => {
  cachedAccessToken = null;
};

/**
 * Format Arabic exam questions into beautiful text representation
 */
export function formatArabicExamAsText(formData: any, questions: any[]): string {
  const arabicLabels = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي', 'ك', 'ل', 'م', 'ن'];
  let text = '';
  
  text += `جمهورية العراق\n`;
  text += `وزارة التربية العراقية\n`;
  text += `اسم المدرسة: ${formData.schoolName || '..........'}\n`;
  text += `العام الدراسي: ${formData.academicYear || '..........'}\n`;
  text += `المادة: ${formData.subject || '..........'} | وقت الامتحان: ${formData.examTime || '..........'} | الامتحان: ${formData.examType || '..........'}\n`;
  text += `مدرس المادة: الأستاذ ${formData.teacherName || '..........'}\n`;
  text += `========================================================================\n\n`;
  text += `ملاحظة: أجب عن الأسئلة التالية مع التركيز والترتيب\n\n`;

  questions.forEach((q, idx) => {
    if (q.sectionTitle) {
      text += `\n[ ${q.sectionTitle} ]\n`;
    }
    
    const marksStr = q.marks ? `   (${q.marks})` : '';
    const label = q.customLabel ? q.customLabel : `س${idx + 1}/`;

    if (q.text) {
      text += `${label} ${q.text}${marksStr}\n`;
    } else if (q.branches && q.branches.length > 0) {
      text += `${label} أجب عما يلي:\n`;
    }

    if (q.type === 'fill_in' && q.fillInWords) {
      const words = q.fillInWords.split(',').map((w: string) => w.trim()).filter(Boolean).join('  ,  ');
      text += `الكلمات للاختيار المباشر: [ ${words} ]\n`;
    }

    if (q.type === 'matching') {
      text += `القائمة (A):\n`;
      (q.matchingList1 || '').split('\n').filter(Boolean).forEach((item: string, i: number) => {
        text += `  ${i + 1}. ${item}\n`;
      });
      text += `القائمة (B):\n`;
      (q.matchingList2 || '').split('\n').filter(Boolean).forEach((item: string, i: number) => {
        const charLabel = String.fromCharCode(97 + i).toLowerCase(); // a, b, c...
        text += `  ${charLabel}. ${item}\n`;
      });
    }

    if (q.branches && q.branches.length > 0) {
      q.branches.forEach((branch: string, bIdx: number) => {
        const branchLabel = arabicLabels[bIdx] || 'أ';
        text += `  ${branchLabel}/ ${branch || '..................................................................................'}\n`;
      });
    }

    text += `\n------------------------------------------------------------------------\n\n`;
  });

  text += `\nتمنياتنا لجميع الطلبة الأعزاء بالنجاح الباهر والموفقية المستمرة.\n`;
  text += `مدرس المادة: الأستاذ ${formData.teacherName || '..........'}\n`;
  return text;
}

/**
 * Format English exam questions into beautiful text representation
 */
export function formatEnglishExamAsText(formData: any, exam: any): string {
  let text = '';
  
  text += `Republic of Iraq\n`;
  text += `Ministry of Education\n`;
  text += `School Name: ${formData.schoolName || '..........'}\n`;
  text += `Academic Year: ${formData.academicYear || '..........'}\n`;
  text += `Subject: ${formData.subject || '..........'} | Time: ${formData.examTime || '..........'} | Exam: ${formData.examType || '..........'}\n`;
  text += `Teacher of the Subject: Mr. ${formData.teacherName || '..........'}\n`;
  text += `========================================================================\n\n`;
  text += `Note: Answer all the questions.\n\n`;

  // Q1: Reading Comprehension
  text += `Q1. Reading Comprehension: (20 Marks)\n`;
  text += `A/ Read this text carefully then answer the questions below:\n\n`;
  text += `"${exam.q1.unseenPassage || '..................................................................................'}"\n\n`;
  (exam.q1.questions || []).forEach((q: string, i: number) => {
    text += `  ${i + 1}. ${q || '..................................................................................'}\n`;
  });
  text += `\n------------------------------------------------------------------------\n\n`;

  // Q2: Textbook Passages
  text += `Q2. Textbook Passages: (10 Marks)\n`;
  text += `Answer or complete the following sentences using information from your textbook:\n\n`;
  (exam.q2.questions || []).forEach((q: string, i: number) => {
    text += `  ${i + 1}. ${q || '..................................................................................'}\n`;
  });
  text += `\n------------------------------------------------------------------------\n\n`;

  // Q3: Grammar
  text += `Q3. Grammar & Functions: (20 Marks)\n`;
  if (exam.q3.isTwoBranches) {
    text += `A/ Re-write the following sentences as required:\n\n`;
    (exam.q3.branchA.questions || []).forEach((q: string, i: number) => {
      text += `  ${i + 1}. ${q || '..................................................................................'}\n`;
    });
    text += `\nB/ Choose the correct word between the brackets:\n\n`;
    (exam.q3.branchB.questions || []).forEach((q: string, i: number) => {
      text += `  ${i + 1}. ${q || '..................................................................................'}\n`;
    });
  } else {
    text += `Answer or complete the following grammatical sentences:\n\n`;
    (exam.q3.branchA.questions || []).forEach((q: string, i: number) => {
      text += `  ${i + 1}. ${q || '..................................................................................'}\n`;
    });
  }
  text += `\n------------------------------------------------------------------------\n\n`;

  // Q4: Vocabulary
  text += `Q4. Vocabulary & Spelling: (20 Marks)\n`;
  (exam.q4.branches || []).forEach((branch: any, brIdx: number) => {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const letter = letters[brIdx] || 'A';
    if (branch.type === 'fill_in') {
      text += `${letter}/ Complete the following sentences with helper words: (${branch.words || ''})\n\n`;
      (branch.questions || []).forEach((q: string, i: number) => {
        text += `  ${i + 1}. ${q || '..................................................................................'}\n`;
      });
    } else if (branch.type === 'matching') {
      text += `${letter}/ Match the words in List A with their definitions in List B:\n\n`;
      text += `  List A: \n`;
      (branch.list1 || '').split('\n').filter(Boolean).forEach((item: string, i: number) => {
        text += `    ${i + 1}. ${item}\n`;
      });
      text += `  List B: \n`;
      (branch.list2 || '').split('\n').filter(Boolean).forEach((item: string, i: number) => {
        const c = String.fromCharCode(97 + i).toLowerCase();
        text += `    ${c}. ${item}\n`;
      });
    } else if (branch.type === 'spelling') {
      text += `${letter}/ Write the missing spelling words:\n\n`;
      (branch.questions || []).forEach((q: string, i: number) => {
        text += `  ${i + 1}. ${q || '..................................................................................'}\n`;
      });
    } else {
      text += `${letter}/ Punctuate the following sentence:\n\n`;
      (branch.questions || []).forEach((q: string, i: number) => {
        text += `  ${i + 1}. ${q || '..................................................................................'}\n`;
      });
    }
    text += `\n`;
  });
  text += `\n------------------------------------------------------------------------\n\n`;

  // Q5: Literature Focus
  text += `Q5. Literature Focus: (10 Marks)\n`;
  text += `${exam.q5.title || 'Answer or complete the following questions:'}\n\n`;
  (exam.q5.questions || []).forEach((q: string, i: number) => {
    text += `  ${i + 1}. ${q || '..................................................................................'}\n`;
  });
  text += `\n------------------------------------------------------------------------\n\n`;

  // Q6: Writing
  text += `Q6. Written Component (Composition): (20 Marks)\n`;
  text += `Choose either A or B to write a short essay about the prompt:\n\n`;
  (exam.q6.prompts || []).forEach((p: string, i: number) => {
    const letters = ['A', 'B'];
    const letter = letters[i] || 'A';
    text += `  ${letter}/ ${p || '..................................................................................'}\n`;
  });
  text += `\n------------------------------------------------------------------------\n\n`;

  text += `\nWish you all the absolute best and brilliant achievements!\n`;
  text += `Teacher: Mr. ${formData.teacherName || '..........'}\n`;
  return text;
}

/**
 * Create a new Document and update it with the formatted exam text
 */
export const createGoogleDocFromExam = async (
  formData: any,
  questions: any[],
  engExam: any,
  isEn: boolean
): Promise<string> => {
  // 1. Get access token
  const token = await signInForGoogleDocs();

  // 2. Generate content
  const docTitle = isEn 
    ? `Exam - ${formData.subject || 'Questions'} (${formData.examType || 'Exam'})`
    : `أسئلة - ${formData.subject || 'امتحان'} (${formData.examType || 'امتحان'})`;

  const docText = isEn 
    ? formatEnglishExamAsText(formData, engExam)
    : formatArabicExamAsText(formData, questions);

  try {
    // 3. Place a request to create a new Doc
    const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: docTitle,
      }),
    });

    if (!createResponse.ok) {
      const errBody = await createResponse.text();
      throw new Error(`تعذر إنشاء المستند: ${createResponse.statusText} (${errBody})`);
    }

    const docObj = await createResponse.json();
    const documentId = docObj.documentId;

    if (!documentId) {
      throw new Error('لم يتم إرجاع معرف المستند من خوادم Google');
    }

    // 4. Update Document contents
    const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              text: docText,
              location: {
                index: 1, // Start of the doc
              },
            },
          },
        ],
      }),
    });

    if (!updateResponse.ok) {
      const errBody = await updateResponse.text();
      throw new Error(`فشل إضافة محتوى الأسئلة إلى المستند: ${updateResponse.statusText} (${errBody})`);
    }

    // Return the viewable Google Docs editing URL
    return `https://docs.google.com/document/d/${documentId}/edit`;
  } catch (error: any) {
    console.error('Google Docs API error:', error);
    throw new Error(error?.message || 'حدث خطأ أثناء الاتصال بخوادم Google Docs');
  }
};
