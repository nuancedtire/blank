import { PDFJS_WORKER_SRC } from "@/lib/pdfjs";

/**
 * Render page 1 of a PDF file into a JPEG thumbnail blob.
 * Uses dynamic import so pdf.js only loads in browser contexts.
 */
export async function generatePdfThumbnailBlob(
  file: File,
): Promise<Blob | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = (await import("pdfjs-dist/build/pdf.mjs")) as {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (args: { data: ArrayBuffer }) => {
        promise: Promise<{
          getPage: (pageNumber: number) => Promise<{
            getViewport: (args: { scale: number }) => {
              width: number;
              height: number;
            };
            render: (args: {
              canvasContext: CanvasRenderingContext2D;
              viewport: { width: number; height: number };
            }) => { promise: Promise<void> };
          }>;
        }>;
      };
    };

    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.55 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    await page.render({ canvasContext: context, viewport }).promise;

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.82);
    });
  } catch {
    return null;
  }
}

/**
 * Render page 1 of a PDF URL into a JPEG thumbnail blob.
 */
export async function generatePdfThumbnailBlobFromUrl(
  url: string,
): Promise<Blob | null> {
  try {
    const pdfjsLib = (await import("pdfjs-dist/build/pdf.mjs")) as {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (args: { url: string }) => {
        promise: Promise<{
          getPage: (pageNumber: number) => Promise<{
            getViewport: (args: { scale: number }) => {
              width: number;
              height: number;
            };
            render: (args: {
              canvasContext: CanvasRenderingContext2D;
              viewport: { width: number; height: number };
            }) => { promise: Promise<void> };
          }>;
        }>;
      };
    };

    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;

    const pdf = await pdfjsLib.getDocument({ url }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.55 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    await page.render({ canvasContext: context, viewport }).promise;

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.82);
    });
  } catch {
    return null;
  }
}
