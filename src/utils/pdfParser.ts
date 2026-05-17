import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerURL from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Use local worker by Vite '?url' query
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerURL;

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    // Limit to prevent browser hang on huge books
    // We only need about 50k - 100k characters for the generation anyway
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
      
      if (fullText.length > 100000) {
        break; // Stop parsing after ~100k characters to prevent memory overflow
      }
    }
    
    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    throw error;
  }
};