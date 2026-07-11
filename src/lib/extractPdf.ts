export async function extractPdf(pdfUrl: string): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const response = await fetch(pdfUrl, {
      headers: { 'User-Agent': 'LivingPapers/2.0 (research tool; mailto:app@livingpapers.io)' },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const data = await pdfParse(buffer, { max: 0 })
    return data.text
  } catch (error) {
    console.error('extractPdf error:', error)
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
