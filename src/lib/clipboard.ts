/**
 * Copy text to the clipboard, reporting success instead of rejecting.
 *
 * navigator.clipboard is unavailable on insecure origins and can be denied by
 * the user, so callers must be able to show a fallback rather than fail silently.
 */
export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}
