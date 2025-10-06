// Deprecated httpInterceptor shim - retained for backward compatibility during refactor.
// All logic moved to simple apiRequest/meApiRequest in config/api.ts.
class NoOpHttpInterceptor {
  fetch(input: RequestInfo | URL, init?: RequestInit) {
    return fetch(input, init);
  }
  fetchMeData() {
    return fetch("/api/users/me");
  }
  setCurrentSession() {}
  onContextChange() {}
}
// Export shim with same name to avoid runtime crashes if stale imports exist.
export const httpInterceptor = new NoOpHttpInterceptor();
export default httpInterceptor;
