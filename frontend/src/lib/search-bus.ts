// Tiny event bus so any component can open the global command palette
// without threading props through the tree.
const EVENT = "silifton:open-search";

export function openSearch() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function onOpenSearch(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
