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

// --- Admin Token ---
export interface AdminPayload extends JWTPayload {
  type: "admin";
  email: string;
  adminId: number;
}

export type TokenPayload = VoterPayload | AdminPayload;

/**
 * Sign a JWT token with the given payload.
 * Voter tokens expire in 1 hour, admin tokens in 8 hours.
 */
export async function signToken(
  payload: Omit<VoterPayload, "iat" | "exp"> | Omit<AdminPayload, "iat" | "exp">
): Promise<string> {
  const expiresIn = payload.type === "admin" ? "8h" : "1h";

  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
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

/**
 * Verify a request has a valid admin token.
 */
export async function requireAdmin(
  request: Request
): Promise<AdminPayload | null> {
  const token = extractToken(request);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || payload.type !== "admin") return null;

  return payload as AdminPayload;
}
