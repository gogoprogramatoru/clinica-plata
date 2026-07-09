"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createDoctorSchema } from "@/lib/validation/admin";
import {
  createDoctorAction,
  updateDoctorAction,
  deleteDoctorAction,
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
export interface DoctorRow {
  id: string;
  name: string;
  active: boolean;
  specialtyId: string;
  specialtyName: string;
}

type CreateValues = { name: string; specialtyId: string };

export function DoctorsManager({
  doctors,
  specialties,
}: {
  doctors: DoctorRow[];
  specialties: SpecialtyOption[];
}) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createDoctorSchema),
    defaultValues: { name: "", specialtyId: specialties[0]?.id ?? "" },
  });

  const onCreate = handleSubmit(async (values) => {
    const res = await createDoctorAction(values);
    if (res.ok) {
      toast.push({ variant: "success", title: "Medic adăugat" });
      reset({ name: "", specialtyId: values.specialtyId });
    } else {
      toast.push({ variant: "error", title: "Eroare", description: res.error });
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Adaugă medic</h2>
          {specialties.length === 0 ? (
            <p className="text-sm text-amber-700">
              Creați mai întâi o specialitate activă.
            </p>
          ) : (
            <form
              onSubmit={onCreate}
              className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
              noValidate
            >
              <Field label="Nume" htmlFor="doc-name" error={errors.name?.message}>
                <Input id="doc-name" {...register("name")} />
              </Field>
              <Field
                label="Specialitate"
                htmlFor="doc-spec"
                error={errors.specialtyId?.message}
              >
                <Select id="doc-spec" {...register("specialtyId")}>
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
        {doctors.length === 0 ? (
          <p className="px-1 text-sm text-slate-500">Niciun medic încă.</p>
        ) : (
          doctors.map((d) => (
            <DoctorItem key={d.id} doctor={d} specialties={specialties} />
          ))
        )}
      </div>
    </div>
  );
}

function DoctorItem({
  doctor,
  specialties,
}: {
  doctor: DoctorRow;
  specialties: SpecialtyOption[];
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(doctor.name);
  const [specialtyId, setSpecialtyId] = useState(doctor.specialtyId);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await updateDoctorAction({ id: doctor.id, name, specialtyId });
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
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
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
                  setName(doctor.name);
                  setSpecialtyId(doctor.specialtyId);
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
              <span className="font-medium text-slate-800">{doctor.name}</span>
              <Badge tone="brand">{doctor.specialtyName}</Badge>
              {!doctor.active && <Badge tone="neutral">Inactiv</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                Editează
              </Button>
              <AdminActionButton
                action={updateDoctorAction}
                input={{ id: doctor.id, active: !doctor.active }}
                successMessage={doctor.active ? "Dezactivat" : "Activat"}
                size="sm"
                variant="secondary"
              >
                {doctor.active ? "Dezactivează" : "Activează"}
              </AdminActionButton>
              <AdminActionButton
                action={deleteDoctorAction}
                input={{ id: doctor.id }}
                confirmMessage="Sigur ștergeți acest medic?"
                successMessage="Șters"
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
