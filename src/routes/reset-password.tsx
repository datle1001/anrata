import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password · Antara" },
      { name: "description", content: "Set a new password for your Antara expert account." },
      { property: "og:title", content: "Antara password recovery" },
      { property: "og:description", content: "Recover access to your saved expert workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});
function Reset() {
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    setRecovery(window.location.hash.includes("type=recovery"));
  }, []);
  return (
    <main className="mx-auto max-w-sm space-y-5 p-6 pt-24">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      {recovery ? (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const { error } = await supabase.auth.updateUser({ password });
            setMessage(error?.message ?? "Password updated.");
          }}
        >
          <Input
            type="password"
            minLength={8}
            required
            aria-label="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button>Update password</Button>
        </form>
      ) : (
        <p className="text-muted-foreground">
          Open the recovery link from your email to set a new password.
        </p>
      )}
      <p role="status">{message}</p>
      <Link to="/auth" className="text-secondary">
        Back to sign in
      </Link>
    </main>
  );
}
