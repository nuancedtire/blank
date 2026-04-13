export const PDFJS_WORKER_SRC =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.5.207/build/pdf.worker.min.mjs";

function createReadableStreamAsyncIterator<T>(stream: ReadableStream<T>) {
  const reader = stream.getReader();

  return {
    async next() {
      const result = await reader.read();
      if (result.done) {
        reader.releaseLock();
      }
      return result;
    },
    async return() {
      try {
        await reader.cancel();
      } finally {
        reader.releaseLock();
      }
      return { done: true, value: undefined };
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

function ensureReadableStreamAsyncIterator() {
  if (typeof ReadableStream === "undefined") {
    return;
  }

  // Safari can expose ReadableStream without the async iterator helpers
  // expected by pdf.js when reading text content streams.
  const prototype = ReadableStream.prototype as ReadableStream<unknown> & {
    [Symbol.asyncIterator]?: () => AsyncIterableIterator<unknown>;
    values?: () => AsyncIterableIterator<unknown>;
  };

  if (typeof prototype[Symbol.asyncIterator] !== "function") {
    prototype[Symbol.asyncIterator] = function () {
      return createReadableStreamAsyncIterator(this);
    };
  }

  if (typeof prototype.values !== "function") {
    prototype.values = function () {
      return createReadableStreamAsyncIterator(this);
    };
  }
}

ensureReadableStreamAsyncIterator();
