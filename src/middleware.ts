import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedUserRoutes = [
  "/journal",
  "/profile",
  "/entries",
  "/patterns",
  "/messages",
  "/notifications",
  "/settings",
];

const protectedTherapistRoutes = ["/therapist/dashboard", "/therapist/clients", "/therapist/alerts", "/therapist/settings"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Check if route requires user auth
  const isProtectedUser = protectedUserRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isProtectedUser && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Check if route requires therapist auth
  const isProtectedTherapist = protectedTherapistRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isProtectedTherapist) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/therapist-login";
      return NextResponse.redirect(url);
    }

    // Check therapist role and approval
    const { data: profile } = await supabase
      .from("users")
      .select("role, is_therapist_verified")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      profile.role !== "therapist" ||
      !profile.is_therapist_verified
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/therapist-login";
      url.searchParams.set("error", "not_approved");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/journal/:path*",
    "/profile/:path*",
    "/entries/:path*",
    "/patterns/:path*",
    "/messages/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/therapist/dashboard/:path*",
    "/therapist/clients/:path*",
    "/therapist/alerts/:path*",
    "/therapist/settings/:path*",
  ],
};
