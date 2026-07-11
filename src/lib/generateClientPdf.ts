'use client'

export async function generateAndUploadPdf(
  paperId: string,
  title: string,
  onProgress?: (msg: string) => void
): Promise<{ fileId: string }> {
  onProgress?.('Capturing page...')

  // Dynamic imports so they are only loaded client-side
  const html2canvas = (await import('html2canvas')).default
  const { jsPDF } = await import('jspdf')

  const element = document.querySelector('main') || document.body

  const canvas = await html2canvas(element, {
    scale: 1.5,
    useCORS: true,
    logging: false,
    backgroundColor: '#0a0e14',
  })

  onProgress?.('Generating PDF...')

  const imgWidth = 210 // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const imgData = canvas.toDataURL('image/jpeg', 0.85)

  // Split into pages if taller than A4
  const pageHeight = 297 // A4 height in mm
  let position = 0
  let remaining = imgHeight

  while (remaining > 0) {
    if (position > 0) pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, -position, imgWidth, imgHeight)
    position += pageHeight
    remaining -= pageHeight
  }

  onProgress?.('Uploading to MongoDB...')

  const pdfBase64 = pdf.output('datauristring').split(',')[1]

  const res = await fetch(`/api/papers/${encodeURIComponent(paperId)}/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfBase64, title }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' })) as { error?: string }
    throw new Error(err.error || 'Upload failed')
  }

  const data = await res.json() as { fileId: string }
  return data
}
