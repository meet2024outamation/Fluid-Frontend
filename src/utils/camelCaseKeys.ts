// Utility to recursively convert object keys to camelCase
// Handles arrays, nested objects, and primitive values

function toCamelCase(str: string): string {
  return str
    .replace(/([A-Z])/g, (match, p1, offset) =>
      offset === 0 ? p1.toLowerCase() : `_${p1.toLowerCase()}`
    )
    .replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

export function keysToCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(keysToCamelCase);
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey =
        key[0].toLowerCase() === key[0]
          ? key
          : key.replace(/^[A-Z]/, (m) => m.toLowerCase());
      acc[camelKey] = keysToCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}
