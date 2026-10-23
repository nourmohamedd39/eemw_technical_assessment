const fs = require("fs/promises");
const path = require("path");
const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");
const { assertExtractedTextSize } = require("../limits");

const standardFontDataUrl = `${path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts")}${path.sep}`;

const extractPdf = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  const document = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true, standardFontDataUrl }).promise;
  try {
    const pages = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(" "));
    }

    const text = pages.join("\n\n").replace(/\r\n/g, "\n").trim();

    if (!text) {
      const error = new Error("This PDF has no extractable text. Scanned or image-only PDFs are not supported without OCR.");
      error.status = 422;
      throw error;
    }

    assertExtractedTextSize(text, "PDF content");
    return { type: "text", text };
  } finally {
    await document.destroy();
  }
};

module.exports = { extractPdf };
