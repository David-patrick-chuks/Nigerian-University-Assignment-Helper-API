import { AlignmentType, Document, Footer, Packer, PageNumber, Paragraph, TextRun } from 'docx';
import { DocumentFormat } from '../types/assignment';

export class DocumentGenerator {

  // Clean content by removing references and bibliography sections
  private cleanContent(text: string): string {
    // Remove references section and everything after it
    const referencesPatterns = [
      /References?\s*\n.*/is,
      /Bibliography\s*\n.*/is,
      /Works Cited\s*\n.*/is,
      /Sources\s*\n.*/is,
      /Citations?\s*\n.*/is
    ];
    
    let cleanedText = text;
    for (const pattern of referencesPatterns) {
      cleanedText = cleanedText.replace(pattern, '');
    }
    
    // Remove any remaining reference-like content at the end
    cleanedText = cleanedText.replace(/\n\s*[A-Z][a-z\s]+\s*\([^)]+\)\.\s*.*$/gm, '');
    
    return cleanedText.trim();
  }

  async generateDocument(format: DocumentFormat, fileType: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    // Clean the content to remove references
    const cleanedFormat = {
      ...format,
      content: this.cleanContent(format.content)
    };
    
    switch (fileType.toLowerCase()) {
      case 'docx':
        return this.generateDocx(cleanedFormat);
      case 'pdf':
        return this.generatePdf(cleanedFormat);
      case 'txt':
        return this.generateTxt(cleanedFormat);
      case 'doc':
        // For .doc files, we'll generate .docx as it's more modern and compatible
        return this.generateDocx(cleanedFormat);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private async generateDocx(format: DocumentFormat): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    try {
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
          headers: {},
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Page ",
                      size: 20
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: 20
                    }),
                    new TextRun({
                      text: " of ",
                      size: 20
                    }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      size: 20
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ]
            })
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'Name: ', bold: true, size: 24 }),
                new TextRun({ text: format.studentInfo.name, size: 24 })
              ],
              alignment: AlignmentType.LEFT
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Matric Number: ', bold: true, size: 24 }),
                new TextRun({ text: format.studentInfo.matric, size: 24 })
              ],
              alignment: AlignmentType.LEFT
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Department: ', bold: true, size: 24 }),
                new TextRun({ text: format.studentInfo.department, size: 24 })
              ],
              alignment: AlignmentType.LEFT
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Course Code: ', bold: true, size: 24 }),
                new TextRun({ text: format.studentInfo.courseCode, size: 24 })
              ],
              alignment: AlignmentType.LEFT
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Course Title: ', bold: true, size: 24 }),
                new TextRun({ text: format.studentInfo.courseTitle, size: 24 })
              ],
              alignment: AlignmentType.LEFT
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Lecturer-in-Charge: ', bold: true, size: 24 }),
                new TextRun({ text: format.studentInfo.lecturerInCharge, size: 24 })
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
    } catch (err) {
      console.error('Error in generateDocx:', err);
      throw err;
    }
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
    // Cap the number of blocks to 200 to prevent runaway parsing
    const cappedBlocks = blocks.slice(0, 200);
    const result: Array<{ type: 'heading' | 'subheading' | 'subsubheading' | 'bullet' | 'para', text: string, bold?: boolean }> = [];
    
    for (let block of cappedBlocks) {
      // Skip empty blocks
      if (!block.trim()) continue;
      
      // Headings - look for ## patterns first
      if (/^##\s+/.test(block)) {
        result.push({ type: 'subheading', text: block.replace(/^##\s+/, '').trim(), bold: true });
      } else if (/^###\s+/.test(block)) {
        result.push({ type: 'subsubheading', text: block.replace(/^###\s+/, '').trim(), bold: true });
      } else if (/^#\s+/.test(block)) {
        result.push({ type: 'heading', text: block.replace(/^#\s+/, '').trim(), bold: true });
      }
      // Bullets - look for * or - patterns
      else if (/^([*-])\s+/.test(block)) {
        result.push({ type: 'bullet', text: block.replace(/^([*-])\s+/, '').trim() });
      }
      // Bold paragraph (e.g., **text**)
      else if (/^\*\*.*\*\*$/.test(block)) {
        result.push({ type: 'para', text: block.replace(/^\*\*|\*\*$/g, '').trim(), bold: true });
      }
      // Check if it's a standalone heading (all caps or short title)
      else if (/^[A-Z][A-Z\s]{2,50}$/.test(block) && block.length < 60) {
        result.push({ type: 'heading', text: block.trim(), bold: true });
      }
      // Check if it's a subheading (ends with colon or is a short descriptive title)
      else if ((block.endsWith(':') && block.length < 100) || 
               (/^[A-Z][a-z\s]{3,40}$/.test(block) && block.length < 50)) {
        result.push({ type: 'subheading', text: block.trim(), bold: true });
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
      try {
        const PDFDocument = require('pdfkit');
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
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const fileName = `assignment_${format.studentInfo.matric.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
          resolve({ buffer, fileName, mimeType: 'application/pdf' });
        });

        // Add student information
        doc.fontSize(16).font('Helvetica-Bold').text('STUDENT INFORMATION', { align: 'center' });
        doc.moveDown(0.5);
        
        doc.fontSize(12).font('Helvetica');
        doc.text(`Name: ${format.studentInfo.name}`);
        doc.text(`Matric Number: ${format.studentInfo.matric}`);
        doc.text(`Department: ${format.studentInfo.department}`);
        doc.text(`Course Code: ${format.studentInfo.courseCode}`);
        doc.text(`Course Title: ${format.studentInfo.courseTitle}`);
        doc.text(`Lecturer-in-Charge: ${format.studentInfo.lecturerInCharge}`);
        
        doc.moveDown(1);
        doc.fontSize(14).font('Helvetica-Bold').text('ASSIGNMENT QUESTION', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').text(format.question);
        
        doc.moveDown(1);
        doc.fontSize(14).font('Helvetica-Bold').text('ASSIGNMENT CONTENT', { align: 'center' });
        doc.moveDown(0.5);

        // Parse and add content
        try {
          const blocks = this.parseBasicMarkdown(format.content);
          blocks.forEach(block => {
            switch (block.type) {
              case 'heading':
                doc.fontSize(16).font('Helvetica-Bold').text(block.text);
                doc.moveDown(0.5);
                break;
              case 'subheading':
                doc.fontSize(14).font('Helvetica-Bold').text(block.text);
                doc.moveDown(0.5);
                break;
              case 'subsubheading':
                doc.fontSize(13).font('Helvetica-Bold').text(block.text);
                doc.moveDown(0.5);
                break;
              case 'bullet':
                doc.fontSize(12).font('Helvetica').text(`• ${block.text}`);
                doc.moveDown(0.3);
                break;
              case 'para':
                doc.fontSize(12).font(block.bold ? 'Helvetica-Bold' : 'Helvetica').text(block.text);
                doc.moveDown(0.5);
                break;
            }
          });
        } catch (error) {
          console.error('Error parsing markdown for PDF:', error);
          // Fallback: add content as plain text
          doc.fontSize(12).font('Helvetica').text(format.content);
        }

        doc.end();
      } catch (error) {
        console.error('Error in generatePdf:', error);
        reject(error);
      }
    });
  }

  private async generateTxt(format: DocumentFormat): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    try {
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
    } catch (err) {
      console.error('Error in generateTxt:', err);
      throw err;
    }
  }
}
