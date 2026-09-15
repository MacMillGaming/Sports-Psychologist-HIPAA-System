import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "Prism Secure Portal",
      credentials: {
        username: { label: "Staff ID", type: "text", placeholder: "manager or coach" },
        password: { label: "Passcode", type: "password" }
      },
      async authorize(credentials) {
        // Ping the Python Backend to verify the user against the SQLite Database
        try {
          const res = await fetch("http://localhost:8000/api/auth/verify", {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: credentials?.username,
              password: credentials?.password
            })
          });

          if (res.ok) {
            const user = await res.json();
            return user; // Returns the DB id, name, and role!
          }
          return null;
        } catch (error) {
          console.error("Auth server connection failed:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.role = account?.provider === "google" ? "player" : (user as any).role;
        // Store the DB ID in the token so we know exactly which coach is logged in
        token.db_id = account?.provider === "google" ? null : user.id; 
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).db_id = token.db_id;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = (auth?.user as any)?.role;
      
      const isCoachRoute = nextUrl.pathname.startsWith('/coach');
      const isManagerRoute = nextUrl.pathname.startsWith('/manager');
      
      if (isCoachRoute || isManagerRoute) {
        if (!isLoggedIn) return false;
        
        // Players get kicked to the chat
        if (role === "player") return Response.redirect(new URL('/', nextUrl)); 
        
        // Only Managers can access the /manager route
        if (isManagerRoute && role !== "manager") {
           return Response.redirect(new URL('/coach', nextUrl));
        }
      }
      return true;
    },
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  theme: { colorScheme: "dark", brandColor: "#4f46e5" }
});