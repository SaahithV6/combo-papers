import { GridFSBucket, ObjectId } from 'mongodb'

const BUCKET_NAME = 'paper_pdfs'

export async function savePdf(
  paperId: string,
  pdfBuffer: Buffer,
  metadata: { title: string; paperUrl: string; createdAt: number }
): Promise<string> {
  const { getDb } = await import('@/lib/mongodb')
  const db = await getDb()
  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME })

  const slug = metadata.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const filename = `${slug || paperId}.pdf`

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: { paperId, ...metadata },
    })
    uploadStream.on('finish', () => resolve(uploadStream.id.toString()))
    uploadStream.on('error', reject)
    uploadStream.end(pdfBuffer)
  })
}

export async function getPdf(
  fileId: string
): Promise<{ buffer: Buffer; metadata: object } | null> {
  const { getDb } = await import('@/lib/mongodb')
  const db = await getDb()
  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME })

  let oid: ObjectId
  try {
    oid = new ObjectId(fileId)
  } catch {
    return null
  }

  const files = await bucket.find({ _id: oid }).toArray()
  if (!files.length) return null

  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    const downloadStream = bucket.openDownloadStream(oid)
    downloadStream.on('data', (chunk: Buffer) => chunks.push(chunk))
    downloadStream.on('end', () =>
      resolve({ buffer: Buffer.concat(chunks), metadata: files[0].metadata || {} })
    )
    downloadStream.on('error', reject)
  })
}

export async function getPdfByPaperId(
  paperId: string
): Promise<{ buffer: Buffer; fileId: string; metadata: object } | null> {
  const { getDb } = await import('@/lib/mongodb')
  const db = await getDb()
  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME })

  const files = await bucket
    .find({ 'metadata.paperId': paperId })
    .sort({ uploadDate: -1 })
    .limit(1)
    .toArray()

  if (!files.length) return null

  const file = files[0]
  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    const downloadStream = bucket.openDownloadStream(file._id)
    downloadStream.on('data', (chunk: Buffer) => chunks.push(chunk))
    downloadStream.on('end', () =>
      resolve({
        buffer: Buffer.concat(chunks),
        fileId: file._id.toString(),
        metadata: file.metadata || {},
      })
    )
    downloadStream.on('error', reject)
  })
}

export async function listPdfs(): Promise<
  Array<{ fileId: string; paperId: string; title: string; createdAt: number }>
> {
  const { getDb } = await import('@/lib/mongodb')
  const db = await getDb()
  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME })

  const files = await bucket.find({}).sort({ uploadDate: -1 }).toArray()
  return files.map((f) => ({
    fileId: f._id.toString(),
    paperId: (f.metadata?.paperId as string) || '',
    title: (f.metadata?.title as string) || f.filename,
    createdAt: (f.metadata?.createdAt as number) || f.uploadDate.getTime(),
  }))
}

export async function deletePdf(fileId: string): Promise<boolean> {
  const { getDb } = await import('@/lib/mongodb')
  const db = await getDb()
  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME })

  let oid: ObjectId
  try {
    oid = new ObjectId(fileId)
  } catch {
    return false
  }

  try {
    await bucket.delete(oid)
    return true
  } catch {
    return false
  }
}
