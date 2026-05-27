export function getUsername(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('username');
}

export function setUsername(username: string): void {
  localStorage.setItem('username', username);
}

export function clearUsername(): void {
  localStorage.removeItem('username');
}
