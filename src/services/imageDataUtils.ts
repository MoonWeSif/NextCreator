const DATA_URL_REGEX = /data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=_-]+)/g;

function looksLikeBase64(value: string): boolean {
  if (value.length < 200) return false;
  return /^[A-Za-z0-9+/=_-]+$/.test(value);
}

export function extractBase64ImageFromText(text?: string): string | null {
  if (!text) return null;
  const matches = text.matchAll(DATA_URL_REGEX);
  for (const match of matches) {
    const base64 = match[1]?.replace(/\s+/g, "");
    if (base64) return base64;
  }

  const trimmed = text.trim();
  if (looksLikeBase64(trimmed)) {
    return trimmed.replace(/\s+/g, "");
  }

  return null;
}

export function normalizeImageInput(imageData: string): { base64: string; mimeType: string } {
  const trimmed = imageData.trim();
  const dataUrlMatch = trimmed.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=_-]+)$/);
  if (dataUrlMatch) {
    return {
      mimeType: `image/${dataUrlMatch[1]}`,
      base64: dataUrlMatch[2],
    };
  }

  return {
    mimeType: "image/png",
    base64: trimmed.replace(/^data:.*?base64,/, ""),
  };
}
