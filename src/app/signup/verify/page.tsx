"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifySignupOtp, resendSignupOtp, type VerifySignupOtpState } from "@/lib/actions/signup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: VerifySignupOtpState = { error: null };

export default function VerifySignupPage() {
  return (
    <Suspense>
      <VerifySignupForm />
    </Suspense>
  );
}

function VerifySignupForm() {
  const email = useSearchParams().get("email") ?? "";
  const [state, formAction, pending] = useActionState(verifySignupOtp, initialState);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleResend() {
    setResending(true);
    try {
      await resendSignupOtp(email);
      setResent(true);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Verify your email</CardTitle>
          <CardDescription>
            We sent a code to {email || "your email"}. Enter it below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="email" value={email} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="token">Verification code</Label>
              <Input
                id="token"
                name="token"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                required
              />
            </div>
            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" disabled={pending} className="mt-2">
              {pending ? "Verifying..." : "Verify"}
            </Button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-center text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {resent ? "Code resent" : resending ? "Resending..." : "Resend code"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
