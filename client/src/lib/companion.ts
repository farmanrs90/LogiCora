// client/src/lib/companion.ts
// Logi/Cora köməkçi sistemi — bütün app üçün TƏK həqiqət mənbəyi (single source of truth).
// Köməkçi seçimi cihaza bağlıdır (localStorage), xarakter tipi isə backend-dən gəlir.

export type Companion = 'logi' | 'cora'
export type CharacterType = 'fast-thinker' | 'deep-analyst' | 'creative-explorer'

// ── Köməkçi (Hero-da seçilir) ───────────────────────────────────────────────
interface CompanionInfo {
  id: Companion
  emoji: string
  name: string
  color: string
  greeting: string // dashboard-da salam mesajı
}

export const COMPANIONS: Record<Companion, CompanionInfo> = {
  logi: { id: 'logi', emoji: '🤖', name: 'Logi', color: '#3B82F6', greeting: 'Hazıram, gəl başlayaq!' },
  cora: { id: 'cora', emoji: '🪄', name: 'Cora', color: '#9333EA', greeting: 'Bu gün nə öyrənirik?' },
}

// ── Xarakter tipi (onboarding test-i hesablayır, backend saxlayır) ──────────
interface CharacterInfo {
  emoji: string // avatar emoji
  label: string
  color: string // avatarColor-un mənbəyi
}

export const CHARACTERS: Record<CharacterType, CharacterInfo> = {
  'fast-thinker':      { emoji: '🦅', label: 'Sürətli Düşünən', color: '#06B6D4' },
  'deep-analyst':      { emoji: '🦉', label: 'Dərin Analitik',  color: '#3B82F6' },
  'creative-explorer': { emoji: '🦋', label: 'Yaradıcı Kəşfçi', color: '#9333EA' },
}

const DEFAULT_COLOR = '#9333EA'   // characterType yoxdursa (köhnə user / onboarding bitməyib)
const STORAGE_KEY = 'companion'

// characterType → avatarColor. null/naməlum → default bənövşəyi.
export function colorForCharacter(ct?: CharacterType | null): string {
  if (ct && CHARACTERS[ct]) return CHARACTERS[ct].color
  return DEFAULT_COLOR
}

// Seçilmiş köməkçini oxu (default: logi).
export function getCompanion(): Companion {
  return localStorage.getItem(STORAGE_KEY) === 'cora' ? 'cora' : 'logi'
}

// Köməkçini yadda saxla (Hero-da klikdə çağırılır).
export function setCompanion(c: Companion): void {
  localStorage.setItem(STORAGE_KEY, c)
}
// ── Köməkçi görünsünmü? (settings toggle, cihaza bağlı) ─────────────────────
const VISIBLE_KEY = 'companionVisible'

// Default: görünür. Yalnız açıq-aşkar 'false' yazılıbsa gizlənir.
export function isCompanionVisible(): boolean {
  return localStorage.getItem(VISIBLE_KEY) !== 'false'
}

export function setCompanionVisibleLS(v: boolean): void {
  localStorage.setItem(VISIBLE_KEY, String(v))
}

