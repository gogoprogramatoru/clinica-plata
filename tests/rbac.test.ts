import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";

import { canAccess, isProtectedPath, ROLE_HOME } from "@/lib/rbac";

describe("canAccess (autorizare pe rol)", () => {
  it("NURSE poate accesa doar zona /nurse", () => {
    expect(canAccess("/nurse", Role.NURSE)).toBe(true);
    expect(canAccess("/reception", Role.NURSE)).toBe(false);
    expect(canAccess("/admin", Role.NURSE)).toBe(false);
  });

  it("RECEPTION poate accesa doar zona /reception", () => {
    expect(canAccess("/reception", Role.RECEPTION)).toBe(true);
    expect(canAccess("/nurse", Role.RECEPTION)).toBe(false);
    expect(canAccess("/admin", Role.RECEPTION)).toBe(false);
  });

  it("ADMIN poate accesa doar zona /admin", () => {
    expect(canAccess("/admin/users", Role.ADMIN)).toBe(true);
    expect(canAccess("/nurse", Role.ADMIN)).toBe(false);
    expect(canAccess("/reception", Role.ADMIN)).toBe(false);
  });

  it("fără rol nu are acces la rute protejate", () => {
    expect(canAccess("/admin", undefined)).toBe(false);
    expect(canAccess("/nurse", undefined)).toBe(false);
  });

  it("căile neprotejate nu sunt gestionate de gating", () => {
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/nurse")).toBe(true);
  });

  it("fiecare rol are un home definit", () => {
    expect(ROLE_HOME[Role.NURSE]).toBe("/nurse");
    expect(ROLE_HOME[Role.RECEPTION]).toBe("/reception");
    expect(ROLE_HOME[Role.ADMIN]).toBe("/admin");
  });
});
