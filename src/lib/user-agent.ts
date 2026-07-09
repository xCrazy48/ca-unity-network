// Lightweight UA parser — no external deps. Returns device/browser/os.
export type UAInfo = { device: string; browser: string; os: string };

export function parseUA(ua: string): UAInfo {
  const s = ua || "";
  const l = s.toLowerCase();

  // OS
  let os = "Unknown";
  if (/windows nt/i.test(s)) os = "Windows";
  else if (/mac os x|macintosh/i.test(s)) os = "macOS";
  else if (/android/i.test(s)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(s)) os = "iOS";
  else if (/linux/i.test(s)) os = "Linux";
  else if (/cros/i.test(s)) os = "ChromeOS";

  // Browser (order matters)
  let browser = "Unknown";
  if (/edg\//i.test(s)) browser = "Edge";
  else if (/opr\/|opera/i.test(s)) browser = "Opera";
  else if (/chrome\//i.test(s) && !/chromium/i.test(l)) browser = "Chrome";
  else if (/firefox\//i.test(s)) browser = "Firefox";
  else if (/safari\//i.test(s) && /version\//i.test(s)) browser = "Safari";
  else if (/crios/i.test(s)) browser = "Chrome iOS";

  // Device
  let device = "Desktop";
  if (/mobile|iphone|android.*mobile/i.test(s)) device = "Mobile";
  else if (/tablet|ipad/i.test(s)) device = "Tablet";

  return { device, browser, os };
}

export function currentUA(): UAInfo {
  if (typeof navigator === "undefined") return { device: "Unknown", browser: "Unknown", os: "Unknown" };
  return parseUA(navigator.userAgent);
}
