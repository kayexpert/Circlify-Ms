import { NextRequest } from "next/server";
import { updateSession } from "./src/lib/supabase/middleware";

export default function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/signin",
    "/signup",
    "/dashboard/:path*",
    "/setup-organization",
  ],
};
