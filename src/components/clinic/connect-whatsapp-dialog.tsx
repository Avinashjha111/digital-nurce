"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, LogIn, Loader2, AlertCircle } from "lucide-react";
import {
  connectWhatsApp,
  checkWhatsAppSenderStatus,
  submitWhatsAppSenderOtp,
  getWhatsAppConnectionState,
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

type Step = "loading" | "start" | "collect-phone" | "pending" | "otp" | "connected";

// Meta's own reference implementation for Embedded Signup: set
// window.fbAsyncInit, THEN inject the SDK script via raw DOM manipulation.
function loadFacebookSdk() {
  if (document.getElementById("facebook-jssdk")) return;

  window.fbAsyncInit = () => {
    window.FB?.init({
      appId: process.env.NEXT_PUBLIC_META_APP_ID ?? "",
      cookie: true,
      xfbml: true,
      version: "v22.0",
    });
  };

  const firstScript = document.getElementsByTagName("script")[0];
  const script = document.createElement("script");
  script.id = "facebook-jssdk";
  script.src = "https://connect.facebook.net/en_US/sdk.js";
  firstScript.parentNode?.insertBefore(script, firstScript);
}

export function ConnectWhatsAppDialog({ clinicId }: { clinicId: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("loading");
  const [hasStoredWaba, setHasStoredWaba] = useState(false);
  const [showReconnectConfirm, setShowReconnectConfirm] = useState(false);
  const [wabaId, setWabaId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [senderStatus, setSenderStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    loadFacebookSdk();
  }, []);

  const loadConnectionState = useCallback(async () => {
    setStep("loading");
    setError(null);
    setShowReconnectConfirm(false);
    try {
      const state = await getWhatsAppConnectionState(clinicId);
      if (state.error) {
        setError(state.error);
        setStep("start");
        return;
      }

      if (state.senderConnected) {
        setSenderStatus(state.senderStatus ?? "ONLINE");
        setStep("connected");
      } else if (state.hasWaba) {
        setHasStoredWaba(true);
        if (state.phoneNumber) {
          setPhone(state.phoneNumber);
        }
        setSenderStatus(state.senderStatus ?? null);
        setStep("collect-phone");
      } else {
        setHasStoredWaba(false);
        setStep("start");
      }
    } catch {
      setError("Failed to load connection status.");
      setStep("start");
    }
  }, [clinicId]);

  function reset() {
    setStep("loading");
    setHasStoredWaba(false);
    setShowReconnectConfirm(false);
    setWabaId(null);
    setPhone("");
    setOtp("");
    setSenderStatus(null);
    setError(null);
    setPending(false);
  }

  function launchEmbeddedSignup() {
    setError(null);
    if (!window.FB) {
      setError("Facebook SDK is still loading -- try again in a moment.");
      return;
    }
    window.FB.login(
      () => {
        // Handled via postMessage listener
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
        setHasStoredWaba(false); // Using freshly linked WABA from Meta
        setShowReconnectConfirm(false);
        setStep("collect-phone");
      }
    } catch {
      // not a JSON message we care about
    }
  }

  async function handleConnect() {
    if (pending || (!hasStoredWaba && !wabaId)) return;
    setPending(true);
    setError(null);
    try {
      const result = await connectWhatsApp(clinicId, {
        wabaId: wabaId ?? undefined,
        phoneE164: phone,
      });
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          window.addEventListener("message", handleEmbeddedSignupMessage);
          loadConnectionState();
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

        {step === "loading" && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Checking WhatsApp connection status...</p>
          </div>
        )}

        {step === "connected" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium">WhatsApp Connected</p>
            <p className="text-xs text-muted-foreground">
              This clinic is actively connected and ready to send WhatsApp messages.
            </p>
            <DialogClose render={<Button />}>Done</DialogClose>
          </div>
        )}

        {step === "start" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Link your clinic&apos;s Facebook and WhatsApp Business Account to begin setup.
            </p>
            <Button type="button" onClick={launchEmbeddedSignup} className="w-fit gap-2">
              <LogIn className="h-4 w-4" />
              Connect with Facebook
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {step === "collect-phone" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                {hasStoredWaba
                  ? "Facebook account already linked"
                  : "Facebook account linked"}
              </p>
              <p className="text-xs text-muted-foreground">
                {hasStoredWaba
                  ? "Complete WhatsApp sender registration with Twilio."
                  : "Enter the clinic's WhatsApp number to finish registering it."}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="phone_e164">WhatsApp number (with country code)</Label>
              <Input
                id="phone_e164"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                disabled={pending}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
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
                ) : hasStoredWaba ? (
                  "Retry WhatsApp Sender"
                ) : (
                  "Register WhatsApp Sender"
                )}
              </Button>

              {hasStoredWaba && !showReconnectConfirm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => setShowReconnectConfirm(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Reconnect Facebook / Change WABA
                </Button>
              )}
            </div>

            {showReconnectConfirm && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="flex flex-col gap-2">
                    <p>
                      Connecting a new Facebook account or WABA will replace this clinic&apos;s
                      linked WhatsApp account. Are you sure you want to proceed?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs"
                        onClick={() => {
                          setShowReconnectConfirm(false);
                          launchEmbeddedSignup();
                        }}
                      >
                        Yes, Connect New Facebook Account
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setShowReconnectConfirm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
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
                  disabled={pending}
                />
                <Button
                  type="button"
                  disabled={pending || !otp.trim()}
                  onClick={handleSubmitOtp}
                  className="w-fit"
                >
                  {pending ? "Verifying..." : "Verify"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={handleCheckStatus}
                >
                  {pending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Check status"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("otp")}
                  disabled={pending}
                >
                  Enter verification code
                </Button>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
