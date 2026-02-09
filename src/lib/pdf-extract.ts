// @ts-expect-error - pdfjs-dist doesn't ship .d.ts for build/pdf.mjs
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";

// Set up the worker via CDN
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs";

/**
 * Extract all text content from a PDF file.
 * Runs client-side using pdf.js.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    if (pageText.trim()) {
      pages.push(pageText.trim());
    }
  }

  return pages.join("\n\n");
}
