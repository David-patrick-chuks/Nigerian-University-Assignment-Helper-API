import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';
import PDFDocument from 'pdfkit';
import { DocumentFormat } from '../types/assignment';

export class DocumentGenerator {



  async generateDocument(format: DocumentFormat, fileType: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    switch (fileType.toLowerCase()) {
      case 'docx':
        return this.generateDocx(format);
      case 'pdf':
        return this.generatePdf(format);
      case 'txt':
        return this.generateTxt(format);
      case 'doc':
        // For .doc files, we'll generate .docx as it's more modern and compatible
        return this.generateDocx(format);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private async generateDocx(format: DocumentFormat): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: `Name: ${format.studentInfo.name}`,
                bold: true,
                size: 24
              })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Matric Number: ${format.studentInfo.matric}`,
                size: 24
              })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Department: ${format.studentInfo.department}`,
                size: 24
              })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Course Code: ${format.studentInfo.courseCode}`,
                size: 24
              })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Course Title: ${format.studentInfo.courseTitle}`,
                size: 24
              })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Lecturer-in-Charge: ${format.studentInfo.lecturerInCharge}`,
                size: 24
              })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [new TextRun({ text: '' })],
            spacing: { before: 400, after: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: format.question,
                bold: true,
                size: 32,
                color: '000000'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 600 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: format.content,
                size: 24
              })
            ],
            alignment: AlignmentType.LEFT,
            spacing: { line: 360 }
          })
        ]
      }]
    });
    const buffer = await Packer.toBuffer(doc);
    const fileName = `assignment_${format.studentInfo.matric.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
    return {
      buffer,
      fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
  }

  // Preprocess AI response to insert double newlines at likely paragraph breaks
  private preprocessParagraphs(text: string): string {
    // 1. Add double newlines after headings (lines that are all caps or end with a colon)
    let processed = text.replace(/(^[A-Z\s]+:?)\n/gm, '$1\n\n');
    // 2. Add double newlines after a period/question mark/exclamation mark followed by a newline and a capital letter
    processed = processed.replace(/([.!?])\n([A-Z])/g, '$1\n\n$2');
    // 3. Add double newlines after bullet points
    processed = processed.replace(/(• .+?)\n/g, '$1\n\n');
    // 4. Remove excessive newlines (more than 2)
    processed = processed.replace(/\n{3,}/g, '\n\n');
    return processed;
  }

  // Smarter paragraph splitter: splits on punctuation followed by space and capital letter, or double newlines
  private splitIntoParagraphs(text: string): string[] {
    // First, normalize all newlines
    let normalized = text.replace(/\r\n?/g, '\n');
    // Replace double newlines with a unique marker
    normalized = normalized.replace(/\n{2,}/g, '[[PARA]]');
    // Split on punctuation followed by space and capital letter (likely paragraph break)
    normalized = normalized.replace(/([.!?]) (?=[A-Z])/g, '$1[[PARA]]');
    // Split on bullet points
    normalized = normalized.replace(/(• .+?)(?=\n|$)/g, '[[PARA]]$1');
    // Now split on the marker
    return normalized.split('[[PARA]]').map(p => p.trim()).filter(Boolean);
  }

  // Detect heading type: returns 'main', 'sub', 'short', or null
  private detectHeadingType(line: string): 'main' | 'sub' | 'short' | null {
    if (/^\d+\.\s+.+/.test(line)) return 'main'; // 1. Heading
    if (/^\d+(\.\d+)+\s+.+/.test(line)) return 'sub'; // 1.1 or 2.2.1 Subheading
    if (/^[A-Z][A-Za-z\s]{2,60}$/.test(line) && !line.endsWith('.')) return 'short'; // Short standalone heading
    return null;
  }

  // Custom parser for real AI response
  private parseCustomParagraphs(text: string): Array<{ type: 'main' | 'sub' | 'bullet' | 'para', text: string }> {
    // Split on bullet points, colons, and capitalized headings
    const lines = text.split(/(?=• )|(?<=:)|(?=\b[A-Z][a-z]+(?: [A-Z][a-z]+){0,5}\b(?![.:]))/g).map(l => l.trim()).filter(Boolean);
    const result: Array<{ type: 'main' | 'sub' | 'bullet' | 'para', text: string }> = [];
    for (let line of lines) {
      if (line.startsWith('•')) {
        result.push({ type: 'bullet', text: line });
      } else if (/^[A-Z][A-Za-z\s]+$/.test(line) && line.length < 60 && !line.endsWith('.') && !line.endsWith(':')) {
        result.push({ type: 'main', text: line });
      } else if (line.endsWith(':')) {
        result.push({ type: 'sub', text: line });
      } else {
        result.push({ type: 'para', text: line });
      }
    }
    return result;
  }

  // Join wrapped lines into full paragraphs/blocks before Markdown parsing
  private joinWrappedLines(text: string): string {
    // Replace Windows line endings
    let normalized = text.replace(/\r\n?/g, '\n');
    // Join lines that are not separated by a blank line
    // (i.e., replace single newlines not followed by another newline with a space)
    normalized = normalized.replace(/([^\n])\n(?!\n)/g, '$1 ');
    return normalized;
  }

  // Markdown-aware parser for Gemini response
  private parseMarkdownBlocks(text: string): Array<{ type: 'main' | 'sub' | 'bullet' | 'para' | 'ref', text: string }> {
    // First, join wrapped lines
    const joined = this.joinWrappedLines(text);
    // Now split on double newlines (real paragraph breaks)
    const lines = joined.split(/\n{2,}/).map(l => l.trim()).filter(Boolean);
    const blocks: Array<{ type: 'main' | 'sub' | 'bullet' | 'para' | 'ref', text: string }> = [];
    for (let line of lines) {
      // Main heading: **Heading** or ## Heading
      if (/^(\*\*|##) ?[A-Z].+[A-Za-z0-9)](\*\*|)$/.test(line)) {
        blocks.push({ type: 'main', text: line.replace(/^(\*\*|##)\s?|\*\*$/g, '').trim() });
      }
      // Subheading: *   **Subheading:** or **Subheading:**
      else if (/^\*\s+\*\*[A-Z].+\*\*:?$/.test(line) || /^\*\*[A-Z].+\*\*:?$/.test(line)) {
        blocks.push({ type: 'sub', text: line.replace(/^\*\s+/, '').replace(/\*\*/g, '').trim() });
      }
      // Bullet: * ... (not subheading)
      else if (/^\*\s+/.test(line)) {
        blocks.push({ type: 'bullet', text: line.replace(/^\*\s+/, '').trim() });
      }
      // Reference: *   Author, Title, etc. (in references section)
      else if (/^\*\s+.+\..+\.$/.test(line)) {
        blocks.push({ type: 'ref', text: line.replace(/^\*\s+/, '').trim() });
      }
      // Paragraph
      else {
        blocks.push({ type: 'para', text: line });
      }
    }
    return blocks;
  }

  // Basic Markdown parser for headings, bold, bullets, and paragraphs
  private parseBasicMarkdown(text: string): Array<{ type: 'heading' | 'subheading' | 'subsubheading' | 'bullet' | 'para', text: string, bold?: boolean }> {
    // Join wrapped lines
    let normalized = text.replace(/\r\n?/g, '\n');
    normalized = normalized.replace(/([^\n])\n(?!\n)/g, '$1 ');
    // Split on double newlines (paragraphs)
    const blocks = normalized.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
    const result: Array<{ type: 'heading' | 'subheading' | 'subsubheading' | 'bullet' | 'para', text: string, bold?: boolean }> = [];
    for (let block of blocks) {
      // Headings
      if (/^###\s+/.test(block)) {
        result.push({ type: 'subsubheading', text: block.replace(/^###\s+/, '').trim(), bold: true });
      } else if (/^##\s+/.test(block)) {
        result.push({ type: 'subheading', text: block.replace(/^##\s+/, '').trim(), bold: true });
      } else if (/^#\s+/.test(block)) {
        result.push({ type: 'heading', text: block.replace(/^#\s+/, '').trim(), bold: true });
      }
      // Bullets
      else if (/^([*-])\s+/.test(block)) {
        result.push({ type: 'bullet', text: block.replace(/^([*-])\s+/, '').trim() });
      }
      // Bold paragraph (e.g., **text**)
      else if (/^\*\*.*\*\*$/.test(block)) {
        result.push({ type: 'para', text: block.replace(/^\*\*|\*\*$/g, '').trim(), bold: true });
      }
      // Paragraph
      else {
        result.push({ type: 'para', text: block });
      }
    }
    return result;
  }

  private async generatePdf(format: DocumentFormat): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72
        }
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const fileName = `assignment_${format.studentInfo.matric.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        resolve({ buffer, fileName, mimeType: 'application/pdf' });
      });
      // Student Info
      doc.fontSize(12).font('Helvetica-Bold').text(`Name: ${format.studentInfo.name.toUpperCase()}`, { align: 'left' });
      doc.font('Helvetica')
        .text(`Matric Number: ${format.studentInfo.matric}`, { align: 'left' })
        .text(`Department: ${format.studentInfo.department}`, { align: 'left' })
        .text(`Course Code: ${format.studentInfo.courseCode}`, { align: 'left' })
        .text(`Course Title: ${format.studentInfo.courseTitle}`, { align: 'left' })
        .text(`Lecturer-in-Charge: ${format.studentInfo.lecturerInCharge}`, { align: 'left' });
      doc.moveDown(1.5);
      // Question
      doc.fontSize(14).font('Helvetica-Bold').text(format.question, { align: 'center' });
      doc.moveDown(1.5);
      // Parse and render basic markdown
      const blocks = this.parseBasicMarkdown(format.content);
      for (const block of blocks) {
        if (block.type === 'heading') {
          doc.moveDown(1.0);
          doc.fontSize(15).font('Helvetica-Bold').text(block.text, { align: 'left' });
          doc.moveDown(0.5);
        } else if (block.type === 'subheading') {
          doc.moveDown(0.7);
          doc.fontSize(13).font('Helvetica-Bold').text(block.text, { align: 'left' });
          doc.moveDown(0.3);
        } else if (block.type === 'subsubheading') {
          doc.moveDown(0.5);
          doc.fontSize(12).font('Helvetica-Bold').text(block.text, { align: 'left' });
          doc.moveDown(0.2);
        } else if (block.type === 'bullet') {
          doc.fontSize(11).font('Helvetica').text('• ' + block.text, { align: 'left', indent: 20 });
          doc.moveDown(0.3);
        } else if (block.type === 'para' && block.bold) {
          doc.fontSize(11).font('Helvetica-Bold').text(block.text, { align: 'left' });
          doc.moveDown(0.5);
        } else {
          doc.fontSize(11).font('Helvetica').text(block.text, { align: 'justify' });
          doc.moveDown(0.7);
        }
      }
      doc.end();
    });
  }

  private async generateTxt(format: DocumentFormat): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const content = [
      `Name: ${format.studentInfo.name}`,
      `Matric Number: ${format.studentInfo.matric}`,
      `Department: ${format.studentInfo.department}`,
      `Course Code: ${format.studentInfo.courseCode}`,
      `Course Title: ${format.studentInfo.courseTitle}`,
      `Lecturer-in-Charge: ${format.studentInfo.lecturerInCharge}`,
      '',
      format.question,
      '',
      format.content
    ].join('\n');
    const buffer = Buffer.from(content, 'utf8');
    const fileName = `assignment_${format.studentInfo.matric.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    return {
      buffer,
      fileName,
      mimeType: 'text/plain'
    };
  }
} 