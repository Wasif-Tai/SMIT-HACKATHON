const encodeBytes = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)));

export async function passwordHash(
  password,
  salt = crypto.getRandomValues(new Uint8Array(16)),
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  return `${encodeBytes(salt)}.${encodeBytes(bits)}`;
}

export async function passwordMatches(password, stored) {
  if (!stored?.includes(".")) return false;
  const [salt, hash] = stored.split(".");
  const decodedSalt = Uint8Array.from(atob(salt), (character) =>
    character.charCodeAt(0),
  );
  return (await passwordHash(password, decodedSalt)).split(".")[1] === hash;
}

export const emailOk = (value) => /^\S+@\S+\.\S+$/.test(value);
