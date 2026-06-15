// NextAuth route handlers — handles /api/auth/signin, /callback, /signout, etc.
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
