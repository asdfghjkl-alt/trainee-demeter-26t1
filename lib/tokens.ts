import { randomUUID, createHash } from "node:crypto";

export const hashToken = (token: string) => {
  return createHash("sha256").update(token).digest("hex");
};

export const generateVerificationToken = () => {
  const token = randomUUID();
  const hashedToken = hashToken(token);
  // Set expiration to 24 hours from now
  const expires = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
  return { token, hashedToken, expires };
};
