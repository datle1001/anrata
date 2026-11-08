import { Document, Packer, Paragraph, TextRun } from "docx";

/** Editable Word letter: Traficom adds the diary number and creates the signed PDF themselves. */
export async function buildLetterDocx(letter: string): Promise<Blob> {
  const doc = new Document({
    sections: [{ children: letter.split("\n").map(line => new Paragraph({ children: [new TextRun({ text: line, font: "Arial", size: 22 })] })) }],
  });
  return Packer.toBlob(doc);
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
