import { NextResponse } from 'next/server'
import { getCategories, addCategory, updateCategory, deleteCategory } from '@/lib/db'
import { handleApiError, ValidationError, ConflictError } from '@/lib/errors'
import { validateStringLength, validatePositiveInteger } from '@/lib/validation'

export async function GET() {
    try {
        const categories = await getCategories()
        return NextResponse.json(categories)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()

        const name = validateStringLength(body.name, 'Category name', 1, 50).toUpperCase()

        // Check for duplicates
        const existing = (await getCategories()).find(c => c.name === name)
        if (existing) {
            throw new ConflictError(`Category "${name}" already exists`, { existingId: existing.id })
        }

        const category = await addCategory(name)
        return NextResponse.json(category, { status: 201 })
    } catch (error) {
        return handleApiError(error)
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()

        const id = validatePositiveInteger(body.id, 'Category ID')
        const name = validateStringLength(body.name, 'Category name', 1, 50).toUpperCase()

        // Check for duplicates (excluding current category)
        const existing = (await getCategories()).find(c => c.name === name && c.id !== id)
        if (existing) {
            throw new ConflictError(`Category "${name}" already exists`, { existingId: existing.id })
        }

        const updated = await updateCategory(id, name)
        if (!updated) {
            throw new ValidationError('Category not found', { id })
        }

        return NextResponse.json(updated)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const idParam = searchParams.get('id')

        if (!idParam) {
            throw new ValidationError('Category ID is required as a query parameter')
        }

        const id = parseInt(idParam)
        if (isNaN(id) || id < 1) {
            throw new ValidationError('Category ID must be a positive integer')
        }

        const deleted = await deleteCategory(id)
        if (!deleted) {
            throw new ConflictError(
                'Cannot delete: category has menu items or does not exist. Remove all items from this category first.',
                { categoryId: id },
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return handleApiError(error)
    }
}
