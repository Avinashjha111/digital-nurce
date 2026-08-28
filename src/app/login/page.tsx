"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import {
  loginStep1,
  verifyLoginOtp,
  type LoginStep1State,
  type VerifyLoginOtpState,
} from "@/lib/actions/auth";
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

const step1Initial: LoginStep1State = { error: null };
const step2Initial: VerifyLoginOtpState = { error: null };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const justVerified = useSearchParams().get("verified") === "1";
  const [step1State, step1Action, step1Pending] = useActionState(loginStep1, step1Initial);
  const [step2State, step2Action, step2Pending] = useActionState(verifyLoginOtp, step2Initial);

  const showOtpStep = step1State.needsOtp;
  const email = step1State.email ?? "";

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Digital Nurse</CardTitle>
          <CardDescription>
            {showOtpStep
              ? `Enter the code we sent to ${email}.`
              : "Sign in to manage your clinic or agency."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showOtpStep ? (
            <form action={step1Action} className="flex flex-col gap-4">
              {justVerified && (
                <p className="text-sm text-status-success">
                  Email verified -- sign in to continue.
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              {step1State.error && (
                <p className="text-sm text-destructive">{step1State.error}</p>
              )}
              <Button type="submit" disabled={step1Pending} className="mt-2">
                {step1Pending ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          ) : (
            <form action={step2Action} className="flex flex-col gap-4">
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
              {step2State.error && (
                <p className="text-sm text-destructive">{step2State.error}</p>
              )}
              <Button type="submit" disabled={step2Pending} className="mt-2">
                {step2Pending ? "Verifying..." : "Verify & sign in"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
