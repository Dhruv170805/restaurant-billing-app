import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getSettings, updateSettings } from '@/lib/db'
import { handleApiError } from '@/lib/errors'
import { validateSettingsUpdate } from '@/lib/validation'

export async function GET() {
  try {
    const settings = await getSettings()
    return NextResponse.json(settings)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()

    // Validate all keys are known and values have correct types
    const validated = validateSettingsUpdate(body)

    const updated = await updateSettings(validated)
    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error)
  }
}
