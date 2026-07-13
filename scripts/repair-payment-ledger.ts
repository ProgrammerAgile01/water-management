import { PrismaClient } from "@prisma/client";
import { rebuildPaymentLedger } from "../lib/payment-ledger";

const prisma = new PrismaClient();

type CliOptions = {
  dryRun?: boolean;
  force?: boolean;
  all?: boolean;
  pelangganId?: string;
  kode?: string;
  nama?: string;
  fromPeriode?: string;
  help?: boolean;
};

function readArgValue(args: string[], index: number, key: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Argumen ${key} membutuhkan value.`);
  }
  return value.trim();
}

function parseCliArgs(argv: string[]): CliOptions {
  const out: CliOptions = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const [key, inlineValue] = arg.split("=", 2);
    const value = inlineValue?.trim();

    switch (key) {
      case "--dry-run":
        out.dryRun = true;
        break;
      case "--force":
      case "--apply":
        out.force = true;
        break;
      case "--all":
        out.all = true;
        break;
      case "--pelanggan-id":
        out.pelangganId = value || readArgValue(argv, i++, key);
        break;
      case "--kode":
        out.kode = value || readArgValue(argv, i++, key);
        break;
      case "--nama":
        out.nama = value || readArgValue(argv, i++, key);
        break;
      case "--from":
      case "--from-periode":
        out.fromPeriode = value || readArgValue(argv, i++, key);
        break;
      case "--help":
      case "-h":
        out.help = true;
        break;
      default:
        throw new Error(`Argumen tidak dikenal: ${arg}`);
    }
  }

  return out;
}

function printHelp() {
  console.log(`
Repair payment ledger

Usage:
  npm run repair:payment-ledger -- --dry-run --kode TBBU7432 --from 2026-07
  npm run repair:payment-ledger -- --force --kode TBBU7432 --from 2026-07
  npm run repair:payment-ledger -- --dry-run --all
  npm run repair:payment-ledger -- --force --all

Options:
  --dry-run              Simulasi, tidak update database.
  --force, --apply       Apply perubahan ke database.
  --kode <kode>          Filter kode pelanggan.
  --nama <nama>          Filter nama pelanggan.
  --pelanggan-id <id>    Filter ID pelanggan.
  --from <YYYY-MM>       Mulai rebuild dari periode tertentu.
  --all                  Izinkan memproses semua pelanggan.
  --help                 Tampilkan bantuan ini.

Env fallback tetap didukung: DRY_RUN, FORCE, ALLOW_ALL, KODE, NAMA, PELANGGAN_ID, FROM_PERIODE.
`);
}

const cli = parseCliArgs(process.argv.slice(2));

const FORCE = cli.force ?? process.env.FORCE === "1";
const DRY_RUN =
  cli.dryRun ?? (!FORCE && process.env.DRY_RUN !== "0" && process.env.FORCE !== "1");
const ALLOW_ALL = cli.all ?? process.env.ALLOW_ALL === "1";

const PELANGGAN_ID = cli.pelangganId ?? process.env.PELANGGAN_ID?.trim();
const KODE = cli.kode ?? process.env.KODE?.trim();
const NAMA = cli.nama ?? process.env.NAMA?.trim();
const FROM_PERIODE = cli.fromPeriode ?? process.env.FROM_PERIODE?.trim();

function log(...args: unknown[]) {
  console.log(new Date().toISOString(), ...args);
}

async function main() {
  if (cli.help) {
    printHelp();
    return;
  }

  if (!DRY_RUN && !FORCE) {
    throw new Error("Gunakan --dry-run untuk simulasi atau --force untuk apply.");
  }

  const hasFilter = Boolean(PELANGGAN_ID || KODE || NAMA);
  if (FORCE && !hasFilter && !ALLOW_ALL) {
    throw new Error(
      "Apply semua pelanggan harus eksplisit: pakai --all, atau filter --pelanggan-id/--kode/--nama."
    );
  }

  const pelanggans = await prisma.pelanggan.findMany({
    where: {
      deletedAt: null,
      ...(PELANGGAN_ID ? { id: PELANGGAN_ID } : {}),
      ...(KODE ? { kode: KODE } : {}),
      ...(NAMA ? { nama: { contains: NAMA } } : {}),
    },
    orderBy: { nama: "asc" },
    select: { id: true, kode: true, nama: true },
  });

  log("Repair payment ledger", {
    mode: DRY_RUN ? "DRY_RUN" : "APPLY",
    pelanggan: pelanggans.length,
    fromPeriode: FROM_PERIODE || "(first selected bill)",
    filters: { PELANGGAN_ID, KODE, NAMA },
  });

  let totalChanges = 0;

  for (const pelanggan of pelanggans) {
    const changes = await prisma.$transaction((tx) =>
      rebuildPaymentLedger(tx, {
        pelangganId: pelanggan.id,
        fromPeriode: FROM_PERIODE,
        dryRun: DRY_RUN,
      })
    );

    if (!changes.length) continue;

    totalChanges += changes.length;
    log(`${pelanggan.kode} - ${pelanggan.nama}: ${changes.length} perubahan`);
    for (const c of changes) {
      log(" ", c.periode, {
        before: c.before,
        after: c.after,
      });
    }
  }

  log("Selesai", { totalChanges });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
