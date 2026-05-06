import { prisma } from "../lib/prisma";
import { randomToken } from "../lib/auth-utils";

type CliOptions = {
  dryRun: boolean;
  periode?: string;
  tagihanId?: string;
  adminId?: string;
  limit: number;
  concurrency: number;
  help: boolean;
};

type PendingTagihan = {
  id: string;
  periode: string;
  pelangganId: string;
  statusVerif: string;
  pelanggan: {
    nama: string;
    kode: string;
  };
  pembayarans: Array<{
    id: string;
    jumlahBayar: number;
    tanggalBayar: Date;
    metode: string;
    createdAt: Date;
  }>;
};

type AdminTarget = {
  id: string;
  name: string;
  phone: string;
};

type SendResult = {
  adminId: string;
  adminName: string;
  phone: string;
  ok: boolean;
  dryRun: boolean;
  status?: number;
  error?: string;
  magicLink?: string;
  waLogId?: string;
};

const DEFAULT_LIMIT = 100;
const DEFAULT_CONCURRENCY = 3;

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    dryRun: true,
    limit: DEFAULT_LIMIT,
    concurrency: DEFAULT_CONCURRENCY,
    help: false,
  };

  for (const raw of argv) {
    if (raw === "--help" || raw === "-h") {
      opts.help = true;
      continue;
    }
    if (raw === "--apply") {
      opts.dryRun = false;
      continue;
    }
    if (raw === "--dry-run") {
      opts.dryRun = true;
      continue;
    }
    if (!raw.startsWith("--")) continue;

    const [key, value = ""] = raw.slice(2).split("=", 2);
    if (key === "periode" && value) opts.periode = value;
    if (key === "tagihan-id" && value) opts.tagihanId = value;
    if (key === "admin-id" && value) opts.adminId = value;
    if (key === "limit" && value) opts.limit = parsePositiveInt(value, "--limit");
    if (key === "concurrency" && value) {
      opts.concurrency = parsePositiveInt(value, "--concurrency");
    }
  }

  if (opts.periode && !/^\d{4}-\d{2}$/.test(opts.periode)) {
    throw new Error("Format --periode harus YYYY-MM.");
  }

  opts.limit = Math.max(1, Math.min(opts.limit, 1000));
  opts.concurrency = Math.max(1, Math.min(opts.concurrency, 20));

  return opts;
}

function parsePositiveInt(value: string, flagName: string) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${flagName} harus bilangan bulat positif.`);
  }
  return n;
}

function printHelp() {
  console.log(`Usage:
  npm run wa:resend-admin-payment -- [options]

Options:
  --dry-run              Simulasi saja. Ini default mode.
  --apply                Jalankan kirim WA sungguhan.
  --periode=YYYY-MM      Filter hanya untuk periode tertentu.
  --tagihan-id=<id>      Filter hanya untuk 1 tagihan tertentu.
  --admin-id=<id>        Kirim hanya ke 1 admin tertentu.
  --limit=<n>            Batas jumlah tagihan yang diproses. Default 100.
  --concurrency=<n>      Jumlah tagihan paralel per batch. Default 3.
  --help, -h             Tampilkan bantuan ini.
`);
}

function getBaseOrigin() {
  return (
    process.env.APP_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  ).replace(/\/$/, "");
}

function formatRp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function fmtTanggalID(d: Date | string) {
  const dd = typeof d === "string" ? new Date(d) : d;
  return dd.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function adminWaText(p: {
  perusahaan?: string | null;
  pelangganNama: string;
  pelangganKode?: string | null;
  periode: string;
  nominal: number;
  metode: string;
  tanggalBayar: Date;
  link?: string;
}) {
  const periodeLabel = new Date(`${p.periode}-01`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  return [
    `*Notifikasi Pembayaran Masuk*${p.perusahaan ? `\n${p.perusahaan}` : ""}`,
    "",
    "----------------------------------",
    `- Pelanggan : ${p.pelangganNama}${
      p.pelangganKode ? ` (${p.pelangganKode})` : ""
    }`,
    `- Periode   : ${periodeLabel}`,
    `- Nominal   : ${formatRp(p.nominal)}`,
    `- Metode    : ${p.metode}`,
    `- Tanggal   : ${fmtTanggalID(p.tanggalBayar)}`,
    "----------------------------------",
    "",
    p.link ? `Tinjau & verifikasi:\n${p.link}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeWa(raw: string) {
  return raw.replace(/\D/g, "").replace(/^0/, "62");
}

async function createMagicLink(params: {
  adminId: string;
  tagihanId: string;
  dryRun: boolean;
}) {
  const origin = getBaseOrigin();
  const next = `/input-pembayaran/${encodeURIComponent(params.tagihanId)}`;

  if (params.dryRun) {
    return origin
      ? `${origin}/api/auth/magic?token=<dry-run-token>&next=${encodeURIComponent(
          next,
        )}`
      : undefined;
  }

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  await prisma.magicLinkToken.create({
    data: {
      token,
      userId: params.adminId,
      tagihanId: params.tagihanId,
      purpose: "admin-review",
      expiresAt,
    },
  });

  return origin
    ? `${origin}/api/auth/magic?token=${encodeURIComponent(
        token,
      )}&next=${encodeURIComponent(next)}`
    : undefined;
}

async function sendWaToAdmin(params: {
  admin: AdminTarget;
  text: string;
  tagihanId: string;
  pembayaranId: string;
  dryRun: boolean;
}) {
  const to = normalizeWa(params.admin.phone);
  const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
  const apiKey = process.env.WA_SENDER_API_KEY || "";
  const payload = {
    to,
    text: params.text,
    meta: {
      purpose: "admin-review-resend",
      tagihanId: params.tagihanId,
      pembayaranId: params.pembayaranId,
      adminId: params.admin.id,
    },
  };

  if (params.dryRun) {
    return {
      adminId: params.admin.id,
      adminName: params.admin.name,
      phone: to,
      ok: true,
      dryRun: true,
    } satisfies SendResult;
  }

  const log = await prisma.waLog.create({
    data: {
      tujuan: to,
      tipe: "APPROVAL PEMBAYARAN RESEND",
      payload: JSON.stringify(payload),
      status: "PENDING",
    },
  });

  try {
    if (!base) {
      throw new Error("WA_SENDER_URL empty");
    }

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 10_000);
    const response = await fetch(`${base}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({ to, text: params.text }),
      signal: ac.signal,
    });
    const bodyText = await response.text().catch(() => "");
    clearTimeout(timeout);

    await prisma.waLog.update({
      where: { id: log.id },
      data: {
        status: response.ok ? "SENT" : "FAILED",
        payload: JSON.stringify({
          ...payload,
          res: {
            ok: response.ok,
            status: response.status,
            body: bodyText.slice(0, 2000),
          },
        }),
      },
    });

    return {
      adminId: params.admin.id,
      adminName: params.admin.name,
      phone: to,
      ok: response.ok,
      dryRun: false,
      status: response.status,
      waLogId: log.id,
      error: response.ok ? undefined : bodyText.slice(0, 300),
    } satisfies SendResult;
  } catch (error: any) {
    await prisma.waLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        payload: JSON.stringify({
          ...payload,
          error: String(error?.message || error),
        }),
      },
    });

    return {
      adminId: params.admin.id,
      adminName: params.admin.name,
      phone: to,
      ok: false,
      dryRun: false,
      waLogId: log.id,
      error: String(error?.message || error),
    } satisfies SendResult;
  }
}

async function processTagihan(params: {
  tagihan: PendingTagihan;
  admins: AdminTarget[];
  settingName?: string | null;
  dryRun: boolean;
}) {
  const latestPayment = params.tagihan.pembayarans[0];
  const results: SendResult[] = [];

  for (const admin of params.admins) {
    const link = await createMagicLink({
      adminId: admin.id,
      tagihanId: params.tagihan.id,
      dryRun: params.dryRun,
    });

    const text = adminWaText({
      perusahaan: params.settingName,
      pelangganNama: params.tagihan.pelanggan.nama || "-",
      pelangganKode: params.tagihan.pelanggan.kode || undefined,
      periode: params.tagihan.periode,
      nominal: Math.round(latestPayment.jumlahBayar),
      metode: latestPayment.metode,
      tanggalBayar: latestPayment.tanggalBayar,
      link,
    });

    const result: SendResult = await sendWaToAdmin({
      admin,
      text,
      tagihanId: params.tagihan.id,
      pembayaranId: latestPayment.id,
      dryRun: params.dryRun,
    });
    result.magicLink = link;
    results.push(result);
  }

  return {
    tagihanId: params.tagihan.id,
    periode: params.tagihan.periode,
    pelangganNama: params.tagihan.pelanggan.nama,
    pelangganKode: params.tagihan.pelanggan.kode,
    pembayaranId: latestPayment.id,
    jumlahBayar: latestPayment.jumlahBayar,
    tanggalBayar: latestPayment.tanggalBayar,
    metode: latestPayment.metode,
    results,
  };
}

async function runInBatches<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
) {
  const output: R[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const settled = await Promise.all(batch.map((item, offset) => worker(item, i + offset)));
    output.push(...settled);
  }

  return output;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const start = Date.now();

  console.log("[resend-admin-payment-wa] mode =", options.dryRun ? "DRY RUN" : "APPLY");
  console.log(
    "[resend-admin-payment-wa] filters =",
    JSON.stringify({
      periode: options.periode ?? null,
      tagihanId: options.tagihanId ?? null,
      adminId: options.adminId ?? null,
      limit: options.limit,
      concurrency: options.concurrency,
    }),
  );

  const [setting, admins, tagihans] = await Promise.all([
    prisma.setting.findUnique({
      where: { id: 1 },
      select: { namaPerusahaan: true },
    }),
    prisma.user.findMany({
      where: {
        role: "ADMIN",
        isActive: true,
        phone: { not: null },
        ...(options.adminId ? { id: options.adminId } : {}),
      },
      select: { id: true, name: true, phone: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tagihan.findMany({
      where: {
        deletedAt: null,
        statusVerif: "UNVERIFIED",
        ...(options.periode ? { periode: options.periode } : {}),
        ...(options.tagihanId ? { id: options.tagihanId } : {}),
        pembayarans: {
          some: {
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        periode: true,
        pelangganId: true,
        statusVerif: true,
        pelanggan: {
          select: {
            nama: true,
            kode: true,
          },
        },
        pembayarans: {
          where: { deletedAt: null },
          orderBy: [{ tanggalBayar: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: {
            id: true,
            jumlahBayar: true,
            tanggalBayar: true,
            metode: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: options.limit,
    }),
  ]);

  const adminPhoneSet = new Set<string>();
  const normalizedAdmins = admins
    .filter((admin) => !!admin.phone)
    .map((admin) => ({
      id: admin.id,
      name: admin.name,
      phone: admin.phone!,
    }))
    .filter((admin) => {
      const normalizedPhone = normalizeWa(admin.phone);
      if (!normalizedPhone) return false;
      if (adminPhoneSet.has(normalizedPhone)) {
        console.warn(
          `[resend-admin-payment-wa] skip duplicate admin phone: ${admin.name} (${normalizedPhone})`,
        );
        return false;
      }
      adminPhoneSet.add(normalizedPhone);
      return true;
    });

  if (normalizedAdmins.length === 0) {
    throw new Error("Tidak ada admin aktif dengan nomor WhatsApp.");
  }

  const normalizedTagihans = tagihans.filter((tagihan) => tagihan.pembayarans.length > 0);

  if (normalizedTagihans.length === 0) {
    console.log("[resend-admin-payment-wa] Tidak ada tagihan pending yang cocok.");
    return;
  }

  const processed = await runInBatches(
    normalizedTagihans,
    options.concurrency,
    (tagihan) =>
      processTagihan({
        tagihan: tagihan as PendingTagihan,
        admins: normalizedAdmins,
        settingName: setting?.namaPerusahaan,
        dryRun: options.dryRun,
      }),
  );

  let successCount = 0;
  let failureCount = 0;

  for (const item of processed) {
    console.log(
      [
        `tagihan=${item.tagihanId}`,
        `periode=${item.periode}`,
        `pelanggan=${item.pelangganNama} (${item.pelangganKode || "-"})`,
        `pembayaran=${item.pembayaranId}`,
        `nominal=${formatRp(item.jumlahBayar)}`,
        `metode=${item.metode}`,
        `tanggal=${fmtTanggalID(item.tanggalBayar)}`,
      ].join(" | "),
    );

    for (const result of item.results) {
      if (result.ok) successCount += 1;
      else failureCount += 1;

      console.log(
        `  -> admin=${result.adminName} phone=${result.phone} status=${
          result.ok ? (result.dryRun ? "DRY_RUN_OK" : "SENT") : "FAILED"
        }${result.status ? ` http=${result.status}` : ""}${
          result.error ? ` error=${result.error}` : ""
        }`,
      );
    }
  }

  const elapsedMs = Date.now() - start;
  console.log(
    "[resend-admin-payment-wa] summary =",
    JSON.stringify({
      mode: options.dryRun ? "DRY_RUN" : "APPLY",
      tagihanProcessed: processed.length,
      adminTargetsPerTagihan: normalizedAdmins.length,
      successCount,
      failureCount,
      elapsedMs,
    }),
  );

  if (!options.dryRun && failureCount > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("[resend-admin-payment-wa] fatal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
