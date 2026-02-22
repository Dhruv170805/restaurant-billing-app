// ── Structured Error Classes ──────────────────────────
// All API errors extend AppError for consistent handling.

import { NextResponse } from 'next/server'

export class AppError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number = 500,
        public readonly code: string = 'INTERNAL_ERROR',
        public readonly details?: Record<string, unknown>,
    ) {
        super(message)
        this.name = this.constructor.name
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, 400, 'VALIDATION_ERROR', details)
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string, id?: number | string) {
        super(
            id ? `${resource} #${id} not found` : `${resource} not found`,
            404,
            'NOT_FOUND',
            { resource, id },
        )
    }
}

export class ConflictError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, 409, 'CONFLICT', details)
    }
}

export class InvalidStateError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, 422, 'INVALID_STATE', details)
    }
}

// ── API Error Response Helper ─────────────────────────
// Maps AppError subclasses to consistent JSON responses.

export function handleApiError(error: unknown): NextResponse {
    if (error instanceof AppError) {
        return NextResponse.json(
            {
                error: error.message,
                code: error.code,
                ...(error.details ? { details: error.details } : {}),
            },
            { status: error.statusCode },
        )
    }

    // Unexpected errors — log and return generic 500
    console.error('Unhandled error:', error)
    return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 },
    )
}
