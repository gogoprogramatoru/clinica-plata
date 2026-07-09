import { describe, it, expect } from "vitest";

import { calculateTicketTotal } from "@/lib/tickets";

describe("calculateTicketTotal", () => {
  it("suma unei liste goale este 0", () => {
    expect(calculateTicketTotal([])).toBe(0);
  });

  it("adună corect mai multe prețuri", () => {
    const total = calculateTicketTotal([
      { price: 250 },
      { price: 120.5 },
      { price: 30.25 },
    ]);
    expect(total).toBe(400.75);
  });

  it("evită erorile de virgulă mobilă (0.1 + 0.2)", () => {
    // 0.1 + 0.2 === 0.30000000000000004 în IEEE-754; funcția trebuie să dea 0.3.
    expect(calculateTicketTotal([{ price: 0.1 }, { price: 0.2 }])).toBe(0.3);
  });

  it("gestionează prețuri custom cu 2 zecimale", () => {
    const total = calculateTicketTotal([
      { price: 19.99 },
      { price: 19.99 },
      { price: 19.99 },
    ]);
    expect(total).toBe(59.97);
  });
});
