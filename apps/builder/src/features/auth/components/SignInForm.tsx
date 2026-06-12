import { sanitizeUrl } from "@braintree/sanitize-url";
import { useMutation } from "@tanstack/react-query";
import { Alert } from "@typebot.io/ui/components/Alert";
import { Button } from "@typebot.io/ui/components/Button";
import { Field } from "@typebot.io/ui/components/Field";
import { Input } from "@typebot.io/ui/components/Input";
import { Otp } from "@typebot.io/ui/components/Otp";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useQueryState } from "nuqs";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { orpc } from "@/lib/queryClient";
import { toast } from "@/lib/toast";

type Props = {
  defaultEmail?: string;
  className?: string;
};

type Step =
  | { name: "credentials" }
  | { name: "totp" }
  | { name: "enroll"; qrCodeDataUrl: string; secret: string };

export const SignInForm = ({ defaultEmail }: Props) => {
  const router = useRouter();
  const [redirectPath] = useQueryState("redirectPath");
  const { status } = useSession();

  const [email, setEmail] = useState(defaultEmail ?? "");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<Step>({ name: "credentials" });
  const [isVerifying, setIsVerifying] = useState(false);

  const { mutate: prepareLogin, isPending: isPreparing } = useMutation(
    orpc.auth.prepareLogin.mutationOptions({
      onSuccess: (data) => {
        if (data.step === "enroll")
          setStep({
            name: "enroll",
            qrCodeDataUrl: data.qrCodeDataUrl,
            secret: data.secret,
          });
        else setStep({ name: "totp" });
      },
      onError: () => toast({ description: "Email ou mot de passe incorrect." }),
    }),
  );

  useEffect(() => {
    if (status === "authenticated")
      router.replace(redirectPath ? sanitizeUrl(redirectPath) : "/typebots");
  }, [status, router, redirectPath]);

  const handleCredentialsSubmit = (e: FormEvent) => {
    e.preventDefault();
    prepareLogin({ email: email.trim().toLowerCase(), password });
  };

  const handleTotpComplete = async (totpCode: string) => {
    setIsVerifying(true);
    const response = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      totpCode,
      redirect: false,
    });
    setIsVerifying(false);
    if (response?.ok)
      router.replace(redirectPath ? sanitizeUrl(redirectPath) : "/typebots");
    else
      toast({
        description:
          "Code invalide. Vérifiez votre application d'authentification.",
      });
  };

  return (
    <div className="flex flex-col gap-6 w-[330px]">
      {step.name === "credentials" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={handleCredentialsSubmit}
        >
          <Field.Root>
            <Field.Label>Email</Field.Label>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="email@company.com"
              required
              value={email}
              onValueChange={setEmail}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>Mot de passe</Field.Label>
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              value={password}
              onValueChange={setPassword}
            />
          </Field.Root>
          <Button
            type="submit"
            disabled={
              ["loading", "authenticated"].includes(status) || isPreparing
            }
          >
            Se connecter
          </Button>
        </form>
      )}

      {step.name !== "credentials" && (
        <div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-bottom-4">
          {step.name === "enroll" && (
            <Alert.Root>
              <div className="flex flex-col gap-2">
                <Alert.Title>Configurez Google Authenticator</Alert.Title>
                <Alert.Description>
                  Scannez ce QR code avec votre application (Google
                  Authenticator, Authy…), puis saisissez le code à 6 chiffres
                  pour finaliser.
                </Alert.Description>
                <img
                  src={step.qrCodeDataUrl}
                  alt="QR code TOTP"
                  className="self-center w-44 h-44 bg-white p-2 rounded-md"
                />
                <p className="text-xs text-gray-11 text-center break-all">
                  Clé manuelle : {step.secret}
                </p>
              </div>
            </Alert.Root>
          )}
          <Field.Root>
            <Field.Label>
              {step.name === "enroll"
                ? "Code de confirmation"
                : "Code d'authentification"}
            </Field.Label>
            <Otp.Root
              maxLength={6}
              onComplete={handleTotpComplete}
              disabled={isVerifying}
            >
              <Otp.Group>
                <Otp.Slot index={0} />
                <Otp.Slot index={1} />
                <Otp.Slot index={2} />
                <Otp.Slot index={3} />
                <Otp.Slot index={4} />
                <Otp.Slot index={5} />
              </Otp.Group>
            </Otp.Root>
          </Field.Root>
          <Button
            variant="outline-secondary"
            onClick={() => setStep({ name: "credentials" })}
            disabled={isVerifying}
          >
            Retour
          </Button>
        </div>
      )}
    </div>
  );
};
