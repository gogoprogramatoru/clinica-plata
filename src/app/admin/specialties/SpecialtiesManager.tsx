"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createSpecialtySchema } from "@/lib/validation/admin";
import {
  createSpecialtyAction,
  updateSpecialtyAction,
  deleteSpecialtyAction,
} from "@/features/admin/actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { AdminActionButton } from "../AdminActionButton";

export interface SpecialtyRow {
  id: string;
  name: string;
  active: boolean;
  counts: { doctors: number; procedures: number; nurses: number; tickets: number };
}

type CreateValues = { name: string };

export function SpecialtiesManager({ specialties }: { specialties: SpecialtyRow[] }) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSpecialtySchema),
    defaultValues: { name: "" },
  });

  const onCreate = handleSubmit(async (values) => {
    const res = await createSpecialtyAction(values);
    if (res.ok) {
      toast.push({ variant: "success", title: "Specialitate adăugată" });
      reset({ name: "" });
    } else {
      toast.push({ variant: "error", title: "Eroare", description: res.error });
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Adaugă specialitate
          </h2>
          <form
            onSubmit={onCreate}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            noValidate
          >
            <Field
              label="Denumire"
              htmlFor="spec-name"
              error={errors.name?.message}
              className="flex-1"
            >
              <Input id="spec-name" {...register("name")} />
            </Field>
            <Button type="submit" loading={isSubmitting}>
              Adaugă
            </Button>
          </form>
        </CardBody>
      </Card>

      <div className="space-y-2">
        {specialties.length === 0 ? (
          <p className="px-1 text-sm text-slate-500">Nicio specialitate încă.</p>
        ) : (
          specialties.map((s) => <SpecialtyItem key={s.id} specialty={s} />)
        )}
      </div>
    </div>
  );
}

function SpecialtyItem({ specialty }: { specialty: SpecialtyRow }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(specialty.name);
  const [pending, startTransition] = useTransition();

  function saveName() {
    startTransition(async () => {
      const res = await updateSpecialtyAction({ id: specialty.id, name });
      if (res.ok) {
        toast.push({ variant: "success", title: "Salvat" });
        setEditing(false);
      } else {
        toast.push({ variant: "error", title: "Eroare", description: res.error });
      }
    });
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10"
              />
              <Button size="sm" loading={pending} onClick={saveName}>
                Salvează
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setName(specialty.name);
                  setEditing(false);
                }}
              >
                Anulează
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-800">{specialty.name}</span>
              {specialty.active ? (
                <Badge tone="success">Activă</Badge>
              ) : (
                <Badge tone="neutral">Inactivă</Badge>
              )}
              <span className="text-xs text-slate-400">
                {specialty.counts.doctors} medici · {specialty.counts.procedures}{" "}
                proceduri · {specialty.counts.nurses} asistente
              </span>
            </div>
          )}
        </div>

        {!editing && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              Redenumește
            </Button>
            <AdminActionButton
              action={updateSpecialtyAction}
              input={{ id: specialty.id, active: !specialty.active }}
              successMessage={specialty.active ? "Dezactivată" : "Activată"}
              size="sm"
              variant="secondary"
            >
              {specialty.active ? "Dezactivează" : "Activează"}
            </AdminActionButton>
            <AdminActionButton
              action={deleteSpecialtyAction}
              input={{ id: specialty.id }}
              confirmMessage="Sigur ștergeți această specialitate?"
              successMessage="Ștearsă"
              size="sm"
              variant="danger"
            >
              Șterge
            </AdminActionButton>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
