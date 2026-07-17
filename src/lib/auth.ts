import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "ses-default-secret-change-in-production"
);

// --- Voter Token ---
export interface VoterPayload extends JWTPayload {
  type: "voter";
  studentId: number;
  name: string;
  hasVoted: boolean;
}

export type TokenPayload = VoterPayload;

/**
 * Sign a JWT token with the given payload.
 * Voter tokens expire in 1 hour.
 */
export async function signToken(
  payload: Omit<VoterPayload, "iat" | "exp">
): Promise<string> {
  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT token.
 * Returns null if the token is invalid or expired.
 */
export async function verifyToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header or cookie.
 */
export function extractToken(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Check cookies
  const cookies = request.headers.get("Cookie");
  if (cookies) {
    const tokenCookie = cookies
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("ses_token="));
    if (tokenCookie) {
      return tokenCookie.split("=")[1];
    }
  }

  return null;
}

/**
 * Verify a request has a valid voter token.
 */
export async function requireVoter(
  request: Request
): Promise<VoterPayload | null> {
  const token = extractToken(request);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || payload.type !== "voter") return null;

  return payload as VoterPayload;
}
