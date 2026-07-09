"use client";

import { useMemo } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createTicketSchema, type CreateTicketData } from "@/lib/validation/ticket";
import { createTicketAction } from "@/features/tickets/actions";
import { cn, formatMoney } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface Doctor {
  id: string;
  name: string;
}
interface Procedure {
  id: string;
  name: string;
  defaultPrice: number;
}

// Toate câmpurile ca string pentru inputurile HTML; zod le coerce la trimitere.
interface ItemValue {
  procedureId: string;
  name: string;
  price: string;
  isCustom: boolean;
}
interface FormValues {
  patientName: string;
  doctorId: string;
  observations: string;
  isInsuredCAS: boolean;
  items: ItemValue[];
}

const emptyCatalogItem: ItemValue = {
  procedureId: "",
  name: "",
  price: "",
  isCustom: false,
};
const emptyCustomItem: ItemValue = {
  procedureId: "",
  name: "",
  price: "",
  isCustom: true,
};

export function TicketForm({
  doctors,
  procedures,
}: {
  specialtyName: string;
  doctors: Doctor[];
  procedures: Procedure[];
}) {
  const toast = useToast();
  const singleDoctor = doctors.length === 1 ? doctors[0] : undefined;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, CreateTicketData>({
    // Cast justificat: valorile din form sunt string-uri, iar zod le coerce
    // spre tipul de output (CreateTicketData).
    resolver: zodResolver(createTicketSchema) as Resolver<
      FormValues,
      unknown,
      CreateTicketData
    >,
    defaultValues: {
      patientName: "",
      doctorId: singleDoctor?.id ?? "",
      observations: "",
      isInsuredCAS: false,
      items: [{ ...emptyCatalogItem }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = watch("items");
  const isInsuredCAS = watch("isInsuredCAS");
  const total = useMemo(
    () =>
      (watchedItems ?? []).reduce((sum, it) => {
        const n = Number.parseFloat(it?.price ?? "");
        return sum + (Number.isFinite(n) && n > 0 ? n : 0);
      }, 0),
    [watchedItems],
  );
  // Suma pe care o plătește pacientul: 0 dacă e asigurat CAS.
  const payable = isInsuredCAS ? 0 : total;

  const procedureById = useMemo(
    () => new Map(procedures.map((p) => [p.id, p])),
    [procedures],
  );

  /** La selectarea unei proceduri: completează numele și prețul implicit (editabil). */
  function onSelectProcedure(index: number, procedureId: string) {
    setValue(`items.${index}.procedureId`, procedureId, { shouldDirty: true });
    const proc = procedureById.get(procedureId);
    if (proc) {
      setValue(`items.${index}.name`, proc.name, { shouldDirty: true });
      setValue(`items.${index}.price`, proc.defaultPrice.toFixed(2), {
        shouldDirty: true,
      });
    }
  }

  const onSubmit = handleSubmit(async (data) => {
    const result = await createTicketAction(data);
    if (result.ok) {
      toast.push({
        variant: "success",
        title: "Tichet trimis la recepție",
        description: isInsuredCAS
          ? "Asigurat CAS — pacientul nu plătește"
          : `Total: ${formatMoney(total)}`,
      });
      // Resetăm pentru următorul pacient, păstrând medicul unic auto-selectat.
      reset({
        patientName: "",
        doctorId: singleDoctor?.id ?? "",
        observations: "",
        isInsuredCAS: false,
        items: [{ ...emptyCatalogItem }],
      });
    } else {
      if (result.fieldErrors) {
        for (const [path, message] of Object.entries(result.fieldErrors)) {
          setError(path as keyof FormValues, { message });
        }
      }
      toast.push({ variant: "error", title: "Eroare", description: result.error });
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Card>
        <CardBody className="space-y-5">
          <Field
            label="Nume pacient"
            htmlFor="patientName"
            required
            error={errors.patientName?.message}
          >
            <Input
              id="patientName"
              autoComplete="off"
              aria-invalid={!!errors.patientName}
              {...register("patientName")}
            />
          </Field>

          {/* Medic: auto dacă unul singur, dropdown dacă mai mulți. */}
          {doctors.length === 0 ? (
            <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700">
              Nu există medici configurați pentru specialitatea dvs.
            </p>
          ) : singleDoctor ? (
            <Field label="Medic" htmlFor="doctorDisplay">
              <Input
                id="doctorDisplay"
                value={singleDoctor.name}
                readOnly
                className="bg-surface-muted"
              />
              <input type="hidden" {...register("doctorId")} />
            </Field>
          ) : (
            <Field
              label="Medic"
              htmlFor="doctorId"
              error={errors.doctorId?.message}
            >
              <Select
                id="doctorId"
                aria-invalid={!!errors.doctorId}
                {...register("doctorId")}
              >
                <option value="">— Selectați medicul —</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </CardBody>
      </Card>

      {/* Proceduri */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Proceduri</h2>
            <span className="text-xs text-slate-400">
              {fields.length} {fields.length === 1 ? "linie" : "linii"}
            </span>
          </div>

          {typeof errors.items?.message === "string" && (
            <p className="text-xs font-medium text-red-600" role="alert">
              {errors.items.message}
            </p>
          )}

          <ul className="space-y-3">
            {fields.map((field, index) => {
              const isCustom = watchedItems?.[index]?.isCustom;
              const itemErrors = errors.items?.[index];
              return (
                <li
                  key={field.id}
                  className="rounded-xl border border-slate-100 bg-surface-subtle p-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="flex-1 space-y-2">
                      {isCustom ? (
                        <Field
                          label="Procedură custom"
                          htmlFor={`items.${index}.name`}
                          error={itemErrors?.name?.message}
                        >
                          <Input
                            id={`items.${index}.name`}
                            placeholder="Denumire procedură"
                            aria-invalid={!!itemErrors?.name}
                            {...register(`items.${index}.name`)}
                          />
                        </Field>
                      ) : (
                        <Field
                          label="Procedură"
                          htmlFor={`items.${index}.procedureId`}
                          error={
                            itemErrors?.procedureId?.message ??
                            itemErrors?.name?.message
                          }
                        >
                          <Select
                            id={`items.${index}.procedureId`}
                            value={watchedItems?.[index]?.procedureId ?? ""}
                            aria-invalid={!!itemErrors?.procedureId}
                            onChange={(e) => onSelectProcedure(index, e.target.value)}
                          >
                            <option value="">— Selectați procedura —</option>
                            {procedures.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} · {formatMoney(p.defaultPrice)}
                              </option>
                            ))}
                          </Select>
                          {/* Numele e sincronizat prin setValue; îl păstrăm înregistrat. */}
                          <input type="hidden" {...register(`items.${index}.name`)} />
                        </Field>
                      )}
                    </div>

                    <div className="w-full sm:w-40">
                      <Field
                        label="Preț (lei)"
                        htmlFor={`items.${index}.price`}
                        error={itemErrors?.price?.message}
                      >
                        <Input
                          id={`items.${index}.price`}
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          aria-invalid={!!itemErrors?.price}
                          {...register(`items.${index}.price`)}
                        />
                      </Field>
                    </div>

                    <div className="flex sm:pt-7">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="inline-flex h-11 items-center gap-1 rounded-xl px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                        aria-label="Șterge procedura"
                      >
                        Șterge
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => append({ ...emptyCatalogItem })}
            >
              + Procedură din listă
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => append({ ...emptyCustomItem })}
            >
              + Procedură custom
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Observații */}
      <Card>
        <CardBody>
          <Field
            label="Observații"
            htmlFor="observations"
            hint="Opțional"
            error={errors.observations?.message}
          >
            <Textarea
              id="observations"
              rows={3}
              maxLength={2000}
              {...register("observations")}
            />
          </Field>
        </CardBody>
      </Card>

      {/* Asigurat CAS — pacientul nu plătește */}
      <Card>
        <CardBody className="py-4">
          <label
            htmlFor="isInsuredCAS"
            className={cn(
              "flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-3 transition-colors",
              isInsuredCAS
                ? "border-mint-200 bg-mint-50/60"
                : "border-slate-100 bg-surface-subtle",
            )}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                Asigurat CAS — nu plătește
              </p>
              <p className="text-xs text-slate-500">
                Procedurile se înregistrează, dar suma de încasat de la pacient
                devine 0 (decontează CAS).
              </p>
            </div>
            {/* Comutator (switch) accesibil, bazat pe un checkbox nativ. */}
            <span className="relative inline-flex shrink-0">
              <input
                id="isInsuredCAS"
                type="checkbox"
                className="peer sr-only"
                {...register("isInsuredCAS")}
              />
              <span
                aria-hidden
                className="h-7 w-12 rounded-full bg-slate-300 transition-colors peer-checked:bg-mint-500 peer-focus-visible:ring-2 peer-focus-visible:ring-mint-400 peer-focus-visible:ring-offset-2"
              />
              <span
                aria-hidden
                className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
              />
            </span>
          </label>
        </CardBody>
      </Card>

      {/* Total + trimitere (sticky pe mobil pentru acces ușor) */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-100 bg-white/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">De plată (pacient)</p>
            <p className="text-xl font-semibold text-slate-800">
              {formatMoney(payable)}
            </p>
            {isInsuredCAS && (
              <p className="text-xs font-medium text-mint-600">
                Asigurat CAS · valoare servicii {formatMoney(total)}
              </p>
            )}
          </div>
          <Button type="submit" size="lg" loading={isSubmitting} className="min-w-[9rem]">
            Trimite la recepție
          </Button>
        </div>
      </div>
    </form>
  );
}
