"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Role } from "@prisma/client";

import { createUserSchema } from "@/lib/validation/admin";
import {
  createUserAction,
  updateUserAction,
  resetPasswordAction,
} from "@/features/admin/actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { AdminActionButton } from "../AdminActionButton";

interface SpecialtyOption {
  id: string;
  name: string;
}
export interface UserRow {
  id: string;
  username: string;
  role: Role;
  active: boolean;
  specialtyId: string | null;
  specialtyName: string | null;
}

interface CreateValues {
  username: string;
  password: string;
  role: Role;
  specialtyId: string;
}

export function UsersManager({
  users,
  specialties,
}: {
  users: UserRow[];
  specialties: SpecialtyOption[];
}) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    defaultValues: {
      username: "",
      password: "",
      role: Role.RECEPTION,
      specialtyId: specialties[0]?.id ?? "",
    },
  });

  const role = watch("role");

  const onCreate = handleSubmit(async (values) => {
    // Construim payload-ul: specialitatea contează doar pentru asistente.
    const payload = {
      username: values.username,
      password: values.password,
      role: values.role,
      specialtyId: values.role === Role.NURSE ? values.specialtyId || null : null,
    };

    // Validare client cu ACEEAȘI schemă ca serverul.
    const parsed = createUserSchema.safeParse(payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(issue.path.join(".") as keyof CreateValues, {
          message: issue.message,
        });
      }
      return;
    }

    const res = await createUserAction(parsed.data);
    if (res.ok) {
      toast.push({ variant: "success", title: "Cont creat" });
      reset({
        username: "",
        password: "",
        role: values.role,
        specialtyId: values.specialtyId,
      });
    } else {
      if (res.fieldErrors) {
        for (const [path, message] of Object.entries(res.fieldErrors)) {
          setError(path as keyof CreateValues, { message });
        }
      }
      toast.push({ variant: "error", title: "Eroare", description: res.error });
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Creează cont (Recepție / Asistentă)
          </h2>
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2" noValidate>
            <Field label="Utilizator" htmlFor="u-username" error={errors.username?.message}>
              <Input
                id="u-username"
                autoComplete="off"
                autoCapitalize="none"
                {...register("username")}
              />
            </Field>
            <Field label="Parolă" htmlFor="u-password" error={errors.password?.message}>
              <Input
                id="u-password"
                type="text"
                autoComplete="new-password"
                placeholder="min. 10 caractere, litere + cifre"
                {...register("password")}
              />
            </Field>
            <Field label="Rol" htmlFor="u-role" error={errors.role?.message}>
              <Select id="u-role" {...register("role")}>
                <option value={Role.RECEPTION}>Recepție</option>
                <option value={Role.NURSE}>Asistentă</option>
              </Select>
            </Field>
            {role === Role.NURSE && (
              <Field
                label="Specialitate"
                htmlFor="u-spec"
                error={errors.specialtyId?.message}
              >
                <Select id="u-spec" {...register("specialtyId")}>
                  <option value="">— Selectați —</option>
                  {specialties.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" loading={isSubmitting}>
                Creează cont
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="space-y-2">
        {users.length === 0 ? (
          <p className="px-1 text-sm text-slate-500">Niciun cont încă.</p>
        ) : (
          users.map((u) => (
            <UserItem key={u.id} user={u} specialties={specialties} />
          ))
        )}
      </div>
    </div>
  );
}

function UserItem({
  user,
  specialties,
}: {
  user: UserRow;
  specialties: SpecialtyOption[];
}) {
  const toast = useToast();
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [specOpen, setSpecOpen] = useState(false);
  const [specialtyId, setSpecialtyId] = useState(user.specialtyId ?? "");
  const [pending, startTransition] = useTransition();

  function doReset() {
    startTransition(async () => {
      const res = await resetPasswordAction({ id: user.id, password: newPassword });
      if (res.ok) {
        toast.push({ variant: "success", title: "Parolă resetată" });
        setResetOpen(false);
        setNewPassword("");
      } else {
        toast.push({ variant: "error", title: "Eroare", description: res.error });
      }
    });
  }

  function saveSpecialty() {
    startTransition(async () => {
      const res = await updateUserAction({ id: user.id, specialtyId: specialtyId || null });
      if (res.ok) {
        toast.push({ variant: "success", title: "Specialitate actualizată" });
        setSpecOpen(false);
      } else {
        toast.push({ variant: "error", title: "Eroare", description: res.error });
      }
    });
  }

  return (
    <Card>
      <CardBody className="space-y-3 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-800">{user.username}</span>
            <Badge tone={user.role === Role.NURSE ? "brand" : "neutral"}>
              {user.role === Role.NURSE ? "Asistentă" : "Recepție"}
            </Badge>
            {user.role === Role.NURSE && user.specialtyName && (
              <span className="text-xs text-slate-500">{user.specialtyName}</span>
            )}
            {user.active ? (
              <Badge tone="success">Activ</Badge>
            ) : (
              <Badge tone="neutral">Inactiv</Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setResetOpen((v) => !v)}
            >
              Resetează parola
            </Button>
            {user.role === Role.NURSE && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSpecOpen((v) => !v)}
              >
                Schimbă specialitatea
              </Button>
            )}
            <AdminActionButton
              action={updateUserAction}
              input={{ id: user.id, active: !user.active }}
              successMessage={user.active ? "Dezactivat" : "Activat"}
              confirmMessage={
                user.active ? "Dezactivați acest cont?" : undefined
              }
              size="sm"
              variant={user.active ? "danger" : "secondary"}
            >
              {user.active ? "Dezactivează" : "Activează"}
            </AdminActionButton>
          </div>
        </div>

        {resetOpen && (
          <div className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-3 sm:flex-row sm:items-center">
            <Input
              type="text"
              placeholder="Parolă nouă (min. 10, litere + cifre)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-10 flex-1"
              autoComplete="new-password"
            />
            <Button size="sm" loading={pending} onClick={doReset}>
              Salvează parola
            </Button>
          </div>
        )}

        {specOpen && (
          <div className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-3 sm:flex-row sm:items-center">
            <Select
              value={specialtyId}
              onChange={(e) => setSpecialtyId(e.target.value)}
              className="h-10 flex-1"
            >
              <option value="">— Selectați —</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Button size="sm" loading={pending} onClick={saveSpecialty}>
              Salvează
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
