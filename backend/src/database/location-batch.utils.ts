/**
 * Utility functions for preserving route batch associations within Supabase saved_locations.
 * Since the Supabase saved_locations table does not have batch_id, batch_code, or batch_name columns,
 * batch metadata is bidirectionally encoded into the address field with an HTML comment tag:
 * <!-- batch:<batch_id>:<batch_code>:<batch_name> -->
 */

export function encodeBatchInAddress(
  address?: string,
  batchId?: string,
  batchCode?: string,
  batchName?: string,
): string {
  const clean = (address || '').replace(/\s*<!--\s*batch:[^>]*-->/g, '').trim();
  if (!batchId || batchId === '__none__' || batchId === 'none') return clean;
  return `${clean} <!-- batch:${batchId}:${batchCode || ''}:${batchName || ''} -->`.trim();
}

export function decodeBatchFromAddress(address?: string): {
  cleanAddress: string;
  batchId?: string;
  batchCode?: string;
  batchName?: string;
} {
  if (!address) return { cleanAddress: '' };
  const match = address.match(/<!--\s*batch:([^:]*):([^:]*):([^>]*)-->/);
  const cleanAddress = address.replace(/\s*<!--\s*batch:[^>]*-->/g, '').trim();
  if (match) {
    return {
      cleanAddress,
      batchId: match[1]?.trim() || undefined,
      batchCode: match[2]?.trim() || undefined,
      batchName: match[3]?.trim() || undefined,
    };
  }
  return { cleanAddress };
}
