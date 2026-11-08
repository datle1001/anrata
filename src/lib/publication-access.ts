/** Guest upload capability stays on this origin; never embed it in prompts or exports. */
export function guestPublicationToken() {
  const key = "antara:upload-capability:v1";
  const stored = localStorage.getItem(key);
  if (stored && /^[a-f0-9]{64}$/.test(stored)) return stored;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  localStorage.setItem(key, token);
  return token;
}