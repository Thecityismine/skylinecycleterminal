export async function shareImageFile(file: File, title: string): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    navigator.canShare?.({ files: [file] })
  ) {
    await navigator.share({
      title,
      text: 'Shared from Skyline Cycle Terminal · skylinecycle.com',
      files: [file],
    });
    return true;
  }
  return false;   // caller should fall back to download
}

export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const [, data] = dataUrl.split(',');
    const bytes    = atob(data);
    const arr      = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: 'image/png' });
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}
