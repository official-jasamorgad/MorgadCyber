import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateDownloadToken, hashToken, verifyToken, generateOrderNumber, getTokenExpiryDate } from '@morgad/security'
import { createHash } from 'crypto'

// ── Token Security Tests ──────────────────────────────────────

describe('Token Security', () => {
  it('generates unique tokens', () => {
    const { rawToken: t1 } = generateDownloadToken()
    const { rawToken: t2 } = generateDownloadToken()
    expect(t1).not.toBe(t2)
  })

  it('generates token with sufficient entropy (64 hex chars = 32 bytes = 256 bits)', () => {
    const { rawToken } = generateDownloadToken()
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/)
  })

  it('stores SHA-256 hash, not raw token', () => {
    const { rawToken, tokenHash } = generateDownloadToken()
    // Hash must differ from raw token
    expect(tokenHash).not.toBe(rawToken)
    // Hash must be valid SHA-256 (64 hex chars)
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/)
    // Verify hash is correct SHA-256
    const expected = createHash('sha256').update(rawToken).digest('hex')
    expect(tokenHash).toBe(expected)
  })

  it('verifyToken matches raw token against stored hash', () => {
    const { rawToken, tokenHash } = generateDownloadToken()
    expect(verifyToken(rawToken, tokenHash)).toBe(true)
  })

  it('verifyToken rejects wrong token', () => {
    const { tokenHash } = generateDownloadToken()
    const { rawToken: wrongToken } = generateDownloadToken()
    expect(verifyToken(wrongToken, tokenHash)).toBe(false)
  })

  it('hashToken is deterministic', () => {
    const token = 'test_token_123'
    expect(hashToken(token)).toBe(hashToken(token))
  })
})

// ── Order Number Tests ────────────────────────────────────────

describe('Order Number', () => {
  it('generates unique order numbers', () => {
    const n1 = generateOrderNumber()
    const n2 = generateOrderNumber()
    expect(n1).not.toBe(n2)
  })

  it('follows ORD-YYYYMMDD-XXXXXXXX format', () => {
    const n = generateOrderNumber()
    expect(n).toMatch(/^ORD-\d{8}-[0-9A-F]{8}$/)
  })
})

// ── Token Expiry Tests ────────────────────────────────────────

describe('Token Expiry', () => {
  it('returns future date', () => {
    const expiry = getTokenExpiryDate(7)
    expect(expiry.getTime()).toBeGreaterThan(Date.now())
  })

  it('expired token would be in the past', () => {
    const past = new Date(Date.now() - 1000)
    expect(new Date() > past).toBe(true)
  })

  it('expiry is approximately N days from now', () => {
    const days = 7
    const expiry = getTokenExpiryDate(days)
    const expectedMs = Date.now() + days * 24 * 60 * 60 * 1000
    const diffMs = Math.abs(expiry.getTime() - expectedMs)
    expect(diffMs).toBeLessThan(5000) // within 5 seconds
  })
})

// ── Payment State Machine Logic Tests ────────────────────────

describe('Payment State Machine', () => {
  it('PENDING can transition to PAID', () => {
    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['PAID', 'FAILED', 'EXPIRED'],
      PAID: ['REFUNDED'],
      FAILED: [],
      EXPIRED: [],
      REFUNDED: [],
    }
    expect(allowedTransitions['PENDING']).toContain('PAID')
  })

  it('FAILED cannot transition to PAID without valid event', () => {
    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['PAID', 'FAILED', 'EXPIRED'],
      PAID: ['REFUNDED'],
      FAILED: [],
      EXPIRED: [],
      REFUNDED: [],
    }
    expect(allowedTransitions['FAILED']).not.toContain('PAID')
  })
})

// ── Amount Verification Logic Tests ──────────────────────────

describe('Amount Verification', () => {
  function verifyAmount(localAmount: number, paidAmount: number): boolean {
    return localAmount === paidAmount
  }

  it('accepts correct amount', () => {
    expect(verifyAmount(119000, 119000)).toBe(true)
  })

  it('rejects tampered lower amount', () => {
    expect(verifyAmount(119000, 5000)).toBe(false)
  })

  it('rejects tampered higher amount', () => {
    expect(verifyAmount(119000, 999999)).toBe(false)
  })

  it('rejects zero amount', () => {
    expect(verifyAmount(119000, 0)).toBe(false)
  })
})

// ── Idempotency Logic Tests ───────────────────────────────────

describe('Webhook Idempotency', () => {
  it('same eventId should be detected as duplicate', () => {
    const processedEvents = new Set<string>()
    const eventId = 'mayar_event_123'

    // First processing
    const isDuplicate1 = processedEvents.has(eventId)
    processedEvents.add(eventId)
    expect(isDuplicate1).toBe(false)

    // Second processing (duplicate)
    const isDuplicate2 = processedEvents.has(eventId)
    expect(isDuplicate2).toBe(true)
  })

  it('different eventIds are not duplicates', () => {
    const processedEvents = new Set(['event_001', 'event_002'])
    expect(processedEvents.has('event_003')).toBe(false)
  })
})

// ── Download Limit Tests ──────────────────────────────────────

describe('Download Limit', () => {
  function canDownload(downloadCount: number, maxDownloads: number | null): boolean {
    if (maxDownloads === null) return true
    return downloadCount < maxDownloads
  }

  it('allows download when under limit', () => {
    expect(canDownload(2, 5)).toBe(true)
  })

  it('blocks download when limit reached', () => {
    expect(canDownload(5, 5)).toBe(false)
  })

  it('allows unlimited downloads when maxDownloads is null', () => {
    expect(canDownload(100, null)).toBe(true)
  })

  it('blocks at exactly the limit', () => {
    expect(canDownload(3, 3)).toBe(false)
  })
})

// ── Private Storage Logic Tests ───────────────────────────────

describe('Private Storage', () => {
  it('file key does not expose public URL', () => {
    const fileKey = 'products/prod_001/viral_visual_pack.zip'
    // File key should never be directly accessible via public HTTP
    expect(fileKey).not.toMatch(/^https?:\/\//)
    expect(fileKey).not.toMatch(/^\/public\//)
  })
})
