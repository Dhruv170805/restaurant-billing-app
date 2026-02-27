import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Only allow images
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })
        }

        const uploadsDir = join(process.cwd(), 'public', 'uploads')
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true })
        }

        const ext = file.name.split('.').pop() || 'jpg'
        const filename = `promo-${Date.now()}.${ext}`
        const filepath = join(uploadsDir, filename)

        const bytes = await file.arrayBuffer()
        await writeFile(filepath, Buffer.from(bytes))

        return NextResponse.json({ url: `/uploads/${filename}` })
    } catch (error) {
        console.error('Upload failed:', error)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
}
