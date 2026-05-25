import { SignJWT, jwtVerify, JWTPayload } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const JWT_NAME = process.env.JWT_NAME ?? "project_token";
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is required");
const secret = new TextEncoder().encode(JWT_SECRET);

// Expiration duration for JWT tokens, used signSession
const JWT_EXPIRATION = "7d"; // 7 days
// Expiration duration for JWT cookies in milliseconds, used in cookies.set
const JWT_SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export type SessionPayload = JWTPayload & {
  userData: {
    _id: string;
    email: string;
    fname: string;
    admin: boolean;
  };
};

/**
 * Creates a session payload stored in a cookie
 * @param payload - Information to be stored in the cookie
 * @returns
 */
export async function createSession(payload: SessionPayload) {
  try {
    // sign the payload into a JWT token
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRATION)
      .sign(secret);
    // set the JWT token in the cookie
    const cookieStore = await cookies();
    cookieStore.set(JWT_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(Date.now() + JWT_SESSION_DURATION),
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

// get the session from the cookie
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(JWT_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    const session = payload as SessionPayload;

    // Check if the password was changed after this token was issued
    if (session.userData?._id && payload.iat) {
      const { default: connectToDatabase } = await import("@/lib/mongodb");
      const { default: UserModel } = await import("@/database/user.model");
      await connectToDatabase();
      const user = await UserModel.findById(session.userData._id).select(
        "passwordChangedAt",
      );
      if (user?.passwordChangedAt) {
        const changedAtSeconds = Math.floor(
          user.passwordChangedAt.getTime() / 1000,
        );
        if (payload.iat < changedAtSeconds) {
          return null;
        }
      }
    }

    return session;
  } catch (error) {
    console.error(error);
    return null;
  }
}

// Updates the session to refresh the expiration date
export async function updateSession(request: NextRequest) {
  try {
    const token = request.cookies.get(JWT_NAME)?.value ?? null;
    if (!token) return;
    const { payload } = await jwtVerify(token, secret);
    // Signs a new token with the same payload
    await createSession(payload as SessionPayload);
  } catch (error) {
    // If the token is invalid, clear the session and return an error
    await clearSession();
    console.error(error);
    return;
  }
}

// Clears the JWT token from the cookie
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(JWT_NAME, "", { expires: new Date(0) });
}

export async function updateSessionMiddleware(request: NextRequest) {
  const token = request.cookies.get(JWT_NAME)?.value;
  if (!token) return NextResponse.next({ request: { headers: request.headers } });

  try {
    const { payload } = await jwtVerify(token, secret);
    const newToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRATION)
      .sign(secret);

    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(JWT_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(Date.now() + JWT_SESSION_DURATION),
    });
    return response;
  } catch (err) {
    void err;
    return NextResponse.next({ request: { headers: request.headers } });
  }
}
