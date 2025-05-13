import { marked } from 'marked';

resetMarked();

export default marked;

export function resetMarked(): void {
  marked.setOptions(marked.getDefaults());

  if ('use' in marked) {
    // Test wrapper to handle v5 with breaking changes
    marked.use({ });
  }
}