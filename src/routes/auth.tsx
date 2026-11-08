import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "@/lib/oma/session";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "@lovable.dev/cloud-auth-js/styles.css";
export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Antara" },
      {
        name: "description",
        content: "Sign in to your Antara review workspace and Oma conversation.",
      },
      { property: "og:title", content: "Antara · Expert sign in" },
      {
        property: "og:description",
        content: "Access your saved spectrum reviews and Oma history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auth,
});
function Auth() {
  const user = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-5">
        <Link to="/" className="text-secondary">
          ← Antara
        </Link>
        <h1 className="text-2xl font-semibold">
          {user
            ? "Account connected"
            : mode === "signup"
              ? "Create your account"
              : "Sign in to Antara"}
        </h1>
        {user ? (
          <Button asChild>
            <Link to="/">Return to review desk</Link>
          </Button>
        ) : (
          <>
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setMessage("");
                try {
                  const result =
                    mode === "signup"
                      ? await supabase.auth.signUp({
                          email,
                          password,
                          options: { emailRedirectTo: window.location.origin },
                        })
                      : await supabase.auth.signInWithPassword({ email, password });
                  if (result.error) throw result.error;
                  if (mode === "signup" && !result.data.session)
                    setMessage("Check your email to confirm your account.");
                  else await navigate({ to: "/" });
                } catch (e) {
                  setMessage(e instanceof Error ? e.message : "Sign in failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="block text-sm">
                Email
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>
              <label className="block text-sm">
                Password
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </label>
              <Button className="w-full" disabled={busy}>
                {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
            <Button
              className="google-auth w-full"
              variant="outline"
              onClick={async () => {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (result.error) setMessage(result.error.message);
                else if (!result.redirected) await navigate({ to: "/" });
              }}
            >
              <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              Continue with Google
            </Button>
            <Button
              className="lovable-auth-button w-full"
              onClick={async () => {
                const result = await lovable.auth.signInWithOAuth("lovable", {
                  redirect_uri: window.location.origin,
                });
                if (result.error) setMessage(result.error.message);
                else if (!result.redirected) await navigate({ to: "/" });
              }}
            >
              Continue with Lovable
            </Button>
            <div className="flex justify-between">
              <Button
                variant="link"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setMessage("");
                }}
              >
                {mode === "signin" ? "Create account" : "Sign in instead"}
              </Button>
              <Button
                variant="link"
                onClick={async () => {
                  if (!email) {
                    setMessage("Enter your email first.");
                    return;
                  }
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + "/reset-password",
                  });
                  setMessage(error?.message ?? "Check your email for a password reset link.");
                }}
              >
                Forgot password?
              </Button>
            </div>
          </>
        )}
        {message && (
          <p role="status" className="text-sm text-secondary">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
