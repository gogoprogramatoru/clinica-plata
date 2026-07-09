import { describe, it, expect } from "vitest";

import { createTicketSchema } from "@/lib/validation/ticket";

const base = {
  patientName: "Ion Popescu",
  doctorId: "doc_123",
  observations: "",
  items: [
    { procedureId: "proc_1", name: "Consultație", price: "250.00", isCustom: false },
  ],
};

describe("createTicketSchema", () => {
  it("acceptă un tichet valid din catalog", () => {
    const parsed = createTicketSchema.parse(base);
    expect(parsed.items[0]?.price).toBe(250);
    expect(parsed.observations).toBeNull();
  });

  it("respinge un tichet fără proceduri", () => {
    const res = createTicketSchema.safeParse({ ...base, items: [] });
    expect(res.success).toBe(false);
  });

  it("cere procedureId pentru liniile din catalog", () => {
    const res = createTicketSchema.safeParse({
      ...base,
      items: [{ procedureId: "", name: "X", price: "10", isCustom: false }],
    });
    expect(res.success).toBe(false);
  });

  it("acceptă proceduri custom fără procedureId", () => {
    const res = createTicketSchema.safeParse({
      ...base,
      items: [{ procedureId: "", name: "Pansament special", price: "45.50", isCustom: true }],
    });
    expect(res.success).toBe(true);
  });

  it("respinge prețuri negative", () => {
    const res = createTicketSchema.safeParse({
      ...base,
      items: [{ procedureId: "p", name: "X", price: "-5", isCustom: false }],
    });
    expect(res.success).toBe(false);
  });

  it("respinge prețuri cu mai mult de 2 zecimale", () => {
    const res = createTicketSchema.safeParse({
      ...base,
      items: [{ procedureId: "p", name: "X", price: "10.999", isCustom: false }],
    });
    expect(res.success).toBe(false);
  });

  it("normalizează doctorId gol la null", () => {
    const parsed = createTicketSchema.parse({ ...base, doctorId: "" });
    expect(parsed.doctorId).toBeNull();
  });

  it("isInsuredCAS implicit este false când lipsește", () => {
    const parsed = createTicketSchema.parse(base);
    expect(parsed.isInsuredCAS).toBe(false);
  });

  it("acceptă un tichet marcat Asigurat CAS", () => {
    const parsed = createTicketSchema.parse({ ...base, isInsuredCAS: true });
    expect(parsed.isInsuredCAS).toBe(true);
  });
});
