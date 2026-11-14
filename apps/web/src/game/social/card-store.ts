/** Local-first business card in IndexedDB — never uploaded by default. */

export type BusinessCard = {
  linkedin: string;
  instagram: string;
  whatsapp: string;
  snapchat: string;
  status: string;
};

const DB = "india-irl-card";
const STORE = "profile";
const KEY = "self";

export const emptyCard = (): BusinessCard => ({
  linkedin: "",
  instagram: "",
  whatsapp: "",
  snapchat: "",
  status: "",
});

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadCard(): Promise<BusinessCard> {
  if (typeof indexedDB === "undefined") return emptyCard();
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const g = tx.objectStore(STORE).get(KEY);
      g.onsuccess = () => {
        const v = g.result as BusinessCard | undefined;
        resolve(v ? { ...emptyCard(), ...v } : emptyCard());
      };
      g.onerror = () => resolve(emptyCard());
    });
  } catch {
    return emptyCard();
  }
}

export async function saveCard(card: BusinessCard): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(card, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Shareable subset — only non-empty fields the user picks. */
export function pickCardFields(card: BusinessCard, keys: (keyof BusinessCard)[]): Partial<BusinessCard> {
  const out: Partial<BusinessCard> = {};
  for (const k of keys) {
    const v = card[k]?.trim();
    if (v) out[k] = v;
  }
  return out;
}
