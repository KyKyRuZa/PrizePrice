/**
 * Auth storage для cookie-based сессии.
 * localStorage больше не используется для auth — сессия управляется через httpOnly куки.
 */

export function readStoredSession() {
  // Куки проверяются на бэкенде. Возвращаем null — реальный статус сессии
  // определяется через GET /api/me при инициализации.
  return { session: false, user: null };
}

export function clearStoredSession() {
  // Куки очищаются на бэкенде через res.clearCookie().
  // На клиенте ничего делать не нужно.
}
