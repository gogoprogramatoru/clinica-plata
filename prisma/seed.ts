/**
 * Seed script — creează datele de bootstrap:
 *  - un cont Admin inițial (din variabile de mediu),
 *  - un cont de Recepție demo,
 *  - 2 specialități demo cu medici și proceduri,
 *  - un cont de Asistentă demo legat de o specialitate.
 *
 * Rulează cu: `npm run seed`.
 * Idempotent: folosește upsert pe câmpurile unice, deci poate fi rulat repetat.
 */
import { PrismaClient, Role } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

// Parametri argon2id — vezi src/lib/password.ts pentru aceleași valori.
const ARGON_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variabila de mediu ${name} este obligatorie pentru seed.`);
  }
  return value;
}

/**
 * Aceeași politică de parole ca la crearea conturilor din interfața de admin
 * (src/lib/validation/admin.ts). Seed-ul creează conturi reale, deci nu are
 * voie să accepte parolele-exemplu din `.env.example`; `scripts/gen-env.sh`
 * generează valori care trec această verificare.
 */
function requirePassword(name: string): string {
  const value = requireEnv(name);
  const strong =
    value.length >= 10 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);
  if (!strong) {
    throw new Error(
      `${name} trebuie să aibă minim 10 caractere și să conțină litere și cifre. ` +
        `Generează un .env cu scripts/gen-env.sh.`,
    );
  }
  return value;
}

async function main() {
  const adminUsername = requireEnv("SEED_ADMIN_USERNAME");
  const adminPassword = requirePassword("SEED_ADMIN_PASSWORD");
  const receptionUsername = requireEnv("SEED_RECEPTION_USERNAME");
  const receptionPassword = requirePassword("SEED_RECEPTION_PASSWORD");
  const nurseUsername = requireEnv("SEED_NURSE_USERNAME");
  const nursePassword = requirePassword("SEED_NURSE_PASSWORD");

  // --- Specialități ---
  const cardio = await prisma.specialty.upsert({
    where: { name: "Cardiologie" },
    update: {},
    create: { name: "Cardiologie" },
  });

  const derma = await prisma.specialty.upsert({
    where: { name: "Dermatologie" },
    update: {},
    create: { name: "Dermatologie" },
  });

  // --- Medici ---
  // (Doctor.name nu e unic; evităm duplicarea la re-rulare printr-un guard.)
  const ensureDoctor = async (name: string, specialtyId: string) => {
    const existing = await prisma.doctor.findFirst({ where: { name, specialtyId } });
    if (existing) return existing;
    return prisma.doctor.create({ data: { name, specialtyId } });
  };

  await ensureDoctor("Dr. Elena Ionescu", cardio.id);
  await ensureDoctor("Dr. Andrei Popa", cardio.id);
  await ensureDoctor("Dr. Maria Georgescu", derma.id);

  // --- Proceduri (cu prețuri implicite) ---
  const ensureProcedure = async (
    name: string,
    defaultPrice: string,
    specialtyId: string,
  ) => {
    const existing = await prisma.procedure.findFirst({ where: { name, specialtyId } });
    if (existing) return existing;
    return prisma.procedure.create({ data: { name, defaultPrice, specialtyId } });
  };

  await ensureProcedure("Consultație cardiologică", "250.00", cardio.id);
  await ensureProcedure("Electrocardiogramă (EKG)", "120.00", cardio.id);
  await ensureProcedure("Ecocardiografie", "300.00", cardio.id);

  await ensureProcedure("Consultație dermatologică", "220.00", derma.id);
  await ensureProcedure("Dermatoscopie", "150.00", derma.id);
  await ensureProcedure("Crioterapie leziune", "180.00", derma.id);

  // --- Conturi ---
  const adminHash = await argon2.hash(adminPassword, ARGON_OPTIONS);
  await prisma.user.upsert({
    where: { username: adminUsername },
    update: { role: Role.ADMIN, active: true },
    create: {
      username: adminUsername,
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  const receptionHash = await argon2.hash(receptionPassword, ARGON_OPTIONS);
  await prisma.user.upsert({
    where: { username: receptionUsername },
    update: { role: Role.RECEPTION, active: true },
    create: {
      username: receptionUsername,
      passwordHash: receptionHash,
      role: Role.RECEPTION,
    },
  });

  const nurseHash = await argon2.hash(nursePassword, ARGON_OPTIONS);
  await prisma.user.upsert({
    where: { username: nurseUsername },
    update: { role: Role.NURSE, active: true, specialtyId: cardio.id },
    create: {
      username: nurseUsername,
      passwordHash: nurseHash,
      role: Role.NURSE,
      specialtyId: cardio.id,
    },
  });

  console.log("✅ Seed finalizat cu succes.");
  console.log(`   Admin:     ${adminUsername}`);
  console.log(`   Recepție:  ${receptionUsername}`);
  console.log(`   Asistentă: ${nurseUsername} (Cardiologie)`);
}

main()
  .catch((error) => {
    console.error("❌ Seed eșuat:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
