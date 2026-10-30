/** Lifecycle helpers: memory-engine.md §3 (expiry is independent of TTL deletion). */
export function purgeAt(expiresAt:Date,createdAt:Date):Date {return new Date(+expiresAt+(+expiresAt-+createdAt<3600000 ? 180000 : 86400000));}
