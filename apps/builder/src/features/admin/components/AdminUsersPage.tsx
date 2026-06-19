import { useMutation, useQuery } from "@tanstack/react-query";
import { UserRole } from "@typebot.io/prisma/enum";
import { Button } from "@typebot.io/ui/components/Button";
import { Field } from "@typebot.io/ui/components/Field";
import { Input } from "@typebot.io/ui/components/Input";
import { LoaderCircleIcon } from "@typebot.io/ui/icons/LoaderCircleIcon";
import Link from "next/link";
import { useRouter } from "next/router";
import { type FormEvent, useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useUser } from "@/features/user/hooks/useUser";
import { orpc } from "@/lib/queryClient";
import { toast } from "@/lib/toast";

export const AdminUsersPage = () => {
  const router = useRouter();
  const { user } = useUser();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(true);

  const isCurrentUserAdmin = user?.role === UserRole.ADMIN;

  const { data, isLoading, refetch } = useQuery(
    orpc.admin.listUsers.queryOptions({ enabled: isCurrentUserAdmin }),
  );

  const { mutate: createUser, isPending: isCreating } = useMutation(
    orpc.admin.createUser.mutationOptions({
      onSuccess: () => {
        toast({ type: "success", description: "Utilisateur créé." });
        setEmail("");
        setName("");
        setPassword("");
        setIsAdmin(true);
        refetch();
      },
    }),
  );

  const { mutate: deleteUser } = useMutation(
    orpc.admin.deleteUser.mutationOptions({
      onSuccess: () => {
        toast({ type: "success", description: "Utilisateur supprimé." });
        refetch();
      },
    }),
  );

  const { mutate: resetPassword } = useMutation(
    orpc.admin.resetPassword.mutationOptions({
      onSuccess: () => {
        toast({ type: "success", description: "Mot de passe réinitialisé." });
        refetch();
      },
    }),
  );

  useEffect(() => {
    if (user && !isCurrentUserAdmin) router.replace("/bots");
  }, [user, isCurrentUserAdmin, router]);

  if (!user)
    return (
      <div className="flex justify-center pt-20">
        <LoaderCircleIcon className="animate-spin" />
      </div>
    );

  if (!isCurrentUserAdmin)
    return (
      <div className="flex justify-center pt-20">
        <p>Accès réservé aux administrateurs.</p>
      </div>
    );

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    createUser({
      email: email.trim().toLowerCase(),
      name: name.trim() || undefined,
      password,
      role: isAdmin ? UserRole.ADMIN : UserRole.MEMBER,
    });
  };

  const handleDelete = (userId: string, userEmail: string | null) => {
    if (!confirm(`Supprimer l'utilisateur ${userEmail ?? userId} ?`)) return;
    deleteUser({ userId });
  };

  const handleResetPassword = (userId: string) => {
    const newPassword = prompt(
      "Nouveau mot de passe (min. 8 caractères) :",
    )?.trim();
    if (!newPassword) return;
    if (newPassword.length < 8) {
      toast({
        description: "Le mot de passe doit faire au moins 8 caractères.",
      });
      return;
    }
    const resetTotp = confirm(
      "Réinitialiser aussi le Google Authenticator ? (l'utilisateur devra le reconfigurer)",
    );
    resetPassword({ userId, password: newPassword, resetTotp });
  };

  return (
    <div className="flex flex-col gap-8 max-w-[900px] mx-auto p-8 w-full">
      <Seo title="Gestion des utilisateurs" />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
        <Button variant="outline-secondary" render={<Link href="/bots" />}>
          Retour
        </Button>
      </div>

      <form
        className="flex flex-col gap-4 p-6 rounded-lg bg-gray-2 border"
        onSubmit={handleCreate}
      >
        <h2 className="text-lg font-semibold">Créer un utilisateur</h2>
        <div className="flex gap-4 flex-wrap">
          <Field.Root className="flex-1 min-w-[200px]">
            <Field.Label>Email</Field.Label>
            <Input
              type="email"
              required
              value={email}
              onValueChange={setEmail}
              placeholder="email@company.com"
            />
          </Field.Root>
          <Field.Root className="flex-1 min-w-[200px]">
            <Field.Label>Nom (optionnel)</Field.Label>
            <Input
              value={name}
              onValueChange={setName}
              placeholder="Jean Dupont"
            />
          </Field.Root>
        </div>
        <div className="flex gap-4 flex-wrap items-end">
          <Field.Root className="flex-1 min-w-[200px]">
            <Field.Label>Mot de passe (min. 8 caractères)</Field.Label>
            <Input
              type="password"
              required
              value={password}
              onValueChange={setPassword}
              placeholder="••••••••"
            />
          </Field.Root>
          <label className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
            />
            Administrateur
          </label>
          <Button type="submit" disabled={isCreating} className="mb-1">
            Créer
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          Utilisateurs ({data?.users.length ?? 0})
        </h2>
        {isLoading ? (
          <LoaderCircleIcon className="animate-spin" />
        ) : (
          <div className="flex flex-col gap-2">
            {data?.users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-4 p-3 rounded-md border bg-gray-1"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{u.email}</span>
                  <span className="text-xs text-gray-11">
                    {u.name ? `${u.name} · ` : ""}
                    {u.role === UserRole.ADMIN ? "Admin" : "Membre"} ·{" "}
                    {u.totpEnabled ? "2FA configuré" : "2FA non configuré"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleResetPassword(u.id)}
                  >
                    Reset mot de passe
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={u.id === user.id}
                    onClick={() => handleDelete(u.id, u.email)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
