import { toast } from 'sonner';

/** Copies text and confirms with a toast. Reports failure instead of throwing. */
export async function copyText(value: string, confirmation: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(confirmation);
  } catch {
    toast.error('Could not copy. Select the text and copy it manually.');
  }
}
