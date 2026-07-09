"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createProcedureSchema } from "@/lib/validation/admin";
import {
  createProcedureAction,
  updateProcedureAction,
  deleteProcedureAction,
} from "@/features/admin/actions";
import { formatMoney } from "@/lib/utils";
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
export interface ProcedureRow {
  id: string;
  name: string;
  defaultPrice: number;
  active: boolean;
  specialtyId: string;
  specialtyName: string;
}

type CreateValues = { name: string; defaultPrice: string; specialtyId: string };

export function ProceduresManager({
  procedures,
  specialties,
}: {
  procedures: ProcedureRow[];
  specialties: SpecialtyOption[];
}) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createProcedureSchema),
    defaultValues: { name: "", defaultPrice: "", specialtyId: specialties[0]?.id ?? "" },
  });

  const onCreate = handleSubmit(async (values) => {
    const res = await createProcedureAction(values);
    if (res.ok) {
      toast.push({ variant: "success", title: "Procedură adăugată" });
      reset({ name: "", defaultPrice: "", specialtyId: values.specialtyId });
    } else {
      toast.push({ variant: "error", title: "Eroare", description: res.error });
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Adaugă procedură
          </h2>
          {specialties.length === 0 ? (
            <p className="text-sm text-amber-700">
              Creați mai întâi o specialitate activă.
            </p>
          ) : (
            <form
              onSubmit={onCreate}
              className="grid gap-3 sm:grid-cols-[1fr_140px_1fr_auto] sm:items-end"
              noValidate
            >
              <Field label="Denumire" htmlFor="proc-name" error={errors.name?.message}>
                <Input id="proc-name" {...register("name")} />
              </Field>
              <Field
                label="Preț implicit"
                htmlFor="proc-price"
                error={errors.defaultPrice?.message}
              >
                <Input
                  id="proc-price"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  {...register("defaultPrice")}
                />
              </Field>
              <Field
                label="Specialitate"
                htmlFor="proc-spec"
                error={errors.specialtyId?.message}
              >
                <Select id="proc-spec" {...register("specialtyId")}>
                  {specialties.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button type="submit" loading={isSubmitting}>
                Adaugă
              </Button>
            </form>
          )}
        </CardBody>
      </Card>

      <div className="space-y-2">
        {procedures.length === 0 ? (
          <p className="px-1 text-sm text-slate-500">Nicio procedură încă.</p>
        ) : (
          procedures.map((p) => (
            <ProcedureItem key={p.id} procedure={p} specialties={specialties} />
          ))
        )}
      </div>
    </div>
  );
}

function ProcedureItem({
  procedure,
  specialties,
}: {
  procedure: ProcedureRow;
  specialties: SpecialtyOption[];
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(procedure.name);
  const [price, setPrice] = useState(procedure.defaultPrice.toFixed(2));
  const [specialtyId, setSpecialtyId] = useState(procedure.specialtyId);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await updateProcedureAction({
        id: procedure.id,
        name,
        defaultPrice: price,
        specialtyId,
      });
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
        {editing ? (
          <div className="grid w-full gap-2 sm:grid-cols-[1fr_120px_1fr_auto] sm:items-center">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
            <Input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-10"
            />
            <Select
              value={specialtyId}
              onChange={(e) => setSpecialtyId(e.target.value)}
              className="h-10"
            >
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Button size="sm" loading={pending} onClick={save}>
                Salvează
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setName(procedure.name);
                  setPrice(procedure.defaultPrice.toFixed(2));
                  setSpecialtyId(procedure.specialtyId);
                  setEditing(false);
                }}
              >
                Anulează
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-800">{procedure.name}</span>
              <span className="font-semibold text-brand-700">
                {formatMoney(procedure.defaultPrice)}
              </span>
              <Badge tone="brand">{procedure.specialtyName}</Badge>
              {!procedure.active && <Badge tone="neutral">Inactivă</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                Editează
              </Button>
              <AdminActionButton
                action={updateProcedureAction}
                input={{ id: procedure.id, active: !procedure.active }}
                successMessage={procedure.active ? "Dezactivată" : "Activată"}
                size="sm"
                variant="secondary"
              >
                {procedure.active ? "Dezactivează" : "Activează"}
              </AdminActionButton>
              <AdminActionButton
                action={deleteProcedureAction}
                input={{ id: procedure.id }}
                confirmMessage="Sigur ștergeți această procedură?"
                successMessage="Ștearsă"
                size="sm"
                variant="danger"
              >
                Șterge
              </AdminActionButton>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
