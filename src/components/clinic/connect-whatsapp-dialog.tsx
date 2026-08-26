"use client";

import { useState } from "react";
import Script from "next/script";
import { CheckCircle2, LogIn, Loader2 } from "lucide-react";
import {
  connectWhatsApp,
  checkWhatsAppSenderStatus,
  submitWhatsAppSenderOtp,
} from "@/lib/actions/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (options: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: { authResponse: unknown }) => void,
        options: {
          config_id: string;
          response_type: string;
          override_default_response_type: boolean;
          extras: { setup: { solutionID: string } };
        }
      ) => void;
    };
  }
}

type Step = "start" | "collect-phone" | "connecting" | "pending" | "otp" | "connected";

export function ConnectWhatsAppDialog({ clinicId }: { clinicId: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("start");
  const [fbReady, setFbReady] = useState(false);
  const [wabaId, setWabaId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [senderStatus, setSenderStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setStep("start");
    setWabaId(null);
    setPhone("");
    setOtp("");
    setSenderStatus(null);
    setError(null);
  }

  function initFacebookSdk() {
    if (window.FB || fbReady) return;
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID ?? "",
        cookie: true,
        xfbml: true,
        version: "v22.0",
      });
      setFbReady(true);
    };
  }

  function launchEmbeddedSignup() {
    setError(null);
    if (!window.FB) {
      setError("Facebook SDK is still loading -- try again in a moment.");
      return;
    }
    window.FB.login(
      () => {
        // The OAuth `code` in this callback is unused for Twilio's flow --
        // what we actually need (waba_id) arrives via the postMessage
        // listener below, from the WA_EMBEDDED_SIGNUP FINISH event.
      },
      {
        config_id: process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID ?? "",
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: { solutionID: process.env.NEXT_PUBLIC_TWILIO_SOLUTION_ID ?? "" },
        },
      }
    );
  }

  function handleEmbeddedSignupMessage(event: MessageEvent) {
    if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") {
      return;
    }
    try {
      const data = JSON.parse(event.data);
      if (data.type === "WA_EMBEDDED_SIGNUP" && data.event === "FINISH") {
        setWabaId(data.data?.waba_id ?? null);
        setStep("collect-phone");
      }
    } catch {
      // not a JSON message we care about
    }
  }

  async function handleConnect() {
    if (!wabaId) return;
    setPending(true);
    setError(null);
    try {
      const result = await connectWhatsApp(clinicId, { wabaId, phoneE164: phone });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSenderStatus(result.senderStatus ?? null);
      if (result.senderStatus?.toUpperCase() === "ONLINE") {
        setStep("connected");
      } else {
        setStep("pending");
      }
    } finally {
      setPending(false);
    }
  }

  async function handleCheckStatus() {
    setPending(true);
    setError(null);
    try {
      const result = await checkWhatsAppSenderStatus(clinicId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSenderStatus(result.senderStatus ?? null);
      if (result.senderStatus?.toUpperCase() === "ONLINE") {
        setStep("connected");
      }
    } finally {
      setPending(false);
    }
  }

  async function handleSubmitOtp() {
    setPending(true);
    setError(null);
    try {
      const result = await submitWhatsAppSenderOtp(clinicId, otp);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSenderStatus(result.senderStatus ?? null);
      setStep(result.senderStatus?.toUpperCase() === "ONLINE" ? "connected" : "pending");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="lazyOnload"
        onLoad={initFacebookSdk}
      />
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            window.addEventListener("message", handleEmbeddedSignupMessage);
          } else {
            window.removeEventListener("message", handleEmbeddedSignupMessage);
            reset();
          }
        }}
      >
        <DialogTrigger render={<Button />}>Connect WhatsApp</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect WhatsApp</DialogTitle>
            <DialogDescription>
              Connect this clinic&apos;s WhatsApp Business Account through Facebook --
              we register it with Twilio automatically.
            </DialogDescription>
          </DialogHeader>

          {step === "connected" ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
              <p className="text-sm">WhatsApp connected successfully.</p>
              <DialogClose render={<Button />}>Done</DialogClose>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {step === "start" && (
                <Button type="button" onClick={launchEmbeddedSignup} className="w-fit gap-2">
                  <LogIn className="h-4 w-4" />
                  Connect with Facebook
                </Button>
              )}

              {step === "collect-phone" && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">
                    Facebook account linked. Enter the clinic&apos;s WhatsApp number to
                    finish registering it.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="phone_e164">WhatsApp number (with country code)</Label>
                    <Input
                      id="phone_e164"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={pending || !phone.trim()}
                    onClick={handleConnect}
                    className="w-fit"
                  >
                    {pending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Register WhatsApp Sender"
                    )}
                  </Button>
                </div>
              )}

              {(step === "pending" || step === "otp") && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">
                    WhatsApp is being set up with Twilio (status:{" "}
                    <span className="font-medium">{senderStatus ?? "unknown"}</span>). This
                    can take a few minutes.
                  </p>

                  {step === "otp" ? (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="otp">Verification code</Label>
                      <Input
                        id="otp"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        inputMode="numeric"
                      />
                      <Button type="button" disabled={pending || !otp.trim()} onClick={handleSubmitOtp} className="w-fit">
                        {pending ? "Verifying..." : "Verify"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" disabled={pending} onClick={handleCheckStatus}>
                        {pending ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Checking...
                          </>
                        ) : (
                          "Check status"
                        )}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setStep("otp")}>
                        Enter verification code
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
