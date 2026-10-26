// Class chat messages are kept for three months. Each new message stores `expireAt`; a Firestore
// TTL policy on collection group "chat", field "expireAt", then deletes it automatically.
// Older messages without `expireAt` are cleared from the Admin panel.
export const CHAT_RETENTION_DAYS = 90;
export const CHAT_RETENTION_MS = CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
