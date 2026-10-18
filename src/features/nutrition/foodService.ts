import { db } from '../../db/db'
import type { Food, FoodEntry, Macros, Meal, MealPreset } from '../../db/types'
import { macrosFor, parseOffProduct, type OffFood } from './nutrition'

const OFF = 'https://world.openfoodfacts.org'
const FIELDS = 'code,product_name,product_name_fr,generic_name,generic_name_fr,brands,nutriments,serving_quantity'
const TIMEOUT_MS = 10_000

export class OfflineError extends Error {
  constructor() {
    super('Pas de connexion internet.')
  }
}

async function fetchJson(url: string): Promise<{ status: number; body: unknown }> {
  if (!navigator.onLine) throw new OfflineError()
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    const body = await res.json().catch(() => null)
    return { status: res.status, body }
  } catch {
    // Réseau coupé, délai dépassé ou serveur injoignable : même conséquence pour l'utilisateur.
    throw new OfflineError()
  } finally {
    window.clearTimeout(timer)
  }
}

export type BarcodeResult =
  | { status: 'found'; food: Food }
  | { status: 'not-found'; code: string; name?: string }
  | { status: 'offline'; code: string }
  | { status: 'error'; code: string; message: string }

/** Cherche d'abord dans le cache local, puis sur Open Food Facts. */
export async function lookupBarcode(code: string): Promise<BarcodeResult> {
  const local = await db.foods.where('code').equals(code).first()
  if (local) return { status: 'found', food: local }
  try {
    const { status, body } = await fetchJson(`${OFF}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`)
    const data = body as { status?: number; product?: Record<string, unknown> } | null
    if (status === 404 || data?.status === 0 || !data?.product) return { status: 'not-found', code }
    if (status >= 400) return { status: 'error', code, message: `Open Food Facts a répondu ${status}.` }
    const parsed = parseOffProduct(data.product, code)
    if (!parsed) {
      // Produit connu mais sans valeurs nutritionnelles : saisie manuelle pré-remplie.
      const name = String(data.product.product_name_fr || data.product.product_name || '') || undefined
      return { status: 'not-found', code, name }
    }
    return { status: 'found', food: await saveOffFood(parsed) }
  } catch (e) {
    if (e instanceof OfflineError) return { status: 'offline', code }
    return { status: 'error', code, message: 'Erreur inattendue.' }
  }
}

/** Recherche texte sur Open Food Facts (limitée par l'API : ne pas appeler à chaque frappe). */
export async function searchOnline(query: string): Promise<OffFood[]> {
  const url = `${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=30&sort_by=unique_scans_n&lc=fr&fields=${FIELDS}`
  const { status, body } = await fetchJson(url)
  if (status >= 400) throw new Error(`Open Food Facts a répondu ${status}.`)
  const products = ((body as { products?: Record<string, unknown>[] } | null)?.products ?? []).map((p) => parseOffProduct(p))
  return products.filter((p): p is OffFood => !!p && !!p.code)
}

/** Enregistre (ou met à jour) un produit Open Food Facts dans le cache local. */
export async function saveOffFood(off: OffFood): Promise<Food> {
  const existing = off.code ? await db.foods.where('code').equals(off.code).first() : undefined
  if (existing) {
    // On garde les éventuelles corrections manuelles faites sur ce produit.
    if (existing.source === 'off') await db.foods.update(existing.id, { name: off.name, brand: off.brand, per100: off.per100, servingGrams: off.servingGrams })
    return (await db.foods.get(existing.id))!
  }
  const id = await db.foods.add({ ...off, source: 'off', favorite: 0 })
  return (await db.foods.get(id))!
}

export async function addFoodEntry(p: { date: string; meal: Meal; food: Food; grams: number }) {
  await db.transaction('rw', db.foodEntries, db.foods, async () => {
    await db.foodEntries.add({
      date: p.date,
      meal: p.meal,
      name: p.food.brand ? `${p.food.name} · ${p.food.brand}` : p.food.name,
      foodId: p.food.id,
      grams: p.grams,
      per100: p.food.per100,
      total: macrosFor(p.food.per100, p.grams),
      createdAt: new Date().toISOString(),
    })
    await db.foods.update(p.food.id, { lastUsedAt: new Date().toISOString(), lastGrams: p.grams })
  })
}

export async function addQuickEntry(p: { date: string; meal: Meal; name: string; total: Macros }) {
  await db.foodEntries.add({ ...p, createdAt: new Date().toISOString() })
}

export async function saveMealAsPreset(name: string, entries: FoodEntry[]) {
  return db.mealPresets.add({
    name,
    items: entries.map(({ name, foodId, grams, per100, total }) => ({ name, foodId, grams, per100, total })),
  })
}

export async function applyPreset(preset: MealPreset, date: string, meal: Meal) {
  const now = new Date().toISOString()
  await db.transaction('rw', db.foodEntries, db.mealPresets, async () => {
    await db.foodEntries.bulkAdd(preset.items.map((i) => ({ ...i, date, meal, createdAt: now })))
    await db.mealPresets.update(preset.id, { lastUsedAt: now })
  })
}

export async function setGoals(from: string, goals: Macros) {
  await db.nutritionGoals.put({ ...goals, from })
}
