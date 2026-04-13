// @ts-ignore - pdfjs-dist doesn't ship .d.ts for build/pdf.mjs
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
import { PDFJS_WORKER_SRC } from "@/lib/pdfjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;

/**
 * Extract all text content from a PDF file.
 * Runs client-side using pdf.js.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    const trimmedText = pageText.trim();
    if (trimmedText) {
      pages.push(trimmedText);
    }
  }

  return pages.join("\n\n");
}
