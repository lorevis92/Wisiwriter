import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx'
import { fmtDate, paragraphs } from './format'

export async function exportDocx(chapters, { withTitles, title }) {
  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun({ text: title, font: 'Georgia' })] }),
  ]
  chapters.forEach(c => {
    children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: withTitles ? 100 : 400 },
      children: [new TextRun({ text: fmtDate(c.chapter_date), font: 'Georgia' })],
    }))
    if (withTitles) {
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: c.title, italics: true, font: 'Georgia' })] }))
    }
    c.blocks.forEach(b => {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 160 }, children: [new TextRun({ text: b.title, font: 'Georgia' })] }))
      paragraphs(b.body).forEach(p =>
        children.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 160, line: 360 }, children: [new TextRun({ text: p, font: 'Georgia', size: 24 })] }))
      )
      if (b.closing_line) {
        children.push(new Paragraph({ spacing: { before: 120, after: 200 }, children: [new TextRun({ text: b.closing_line, italics: true, font: 'Georgia', size: 24 })] }))
      }
    })
  })
  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'libro'}.docx`
  a.click()
  URL.revokeObjectURL(a.href)
}
