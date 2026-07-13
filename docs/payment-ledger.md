# Payment Ledger Tirtabening

Dokumen ini menjelaskan alur saldo pembayaran tagihan air, terutama untuk kasus bayar pas, kurang bayar, dan lebih bayar antar periode.

## Tujuan

Payment ledger memastikan status tagihan dihitung konsisten dari satu sumber kebenaran. Sebelum ledger dipusatkan, beberapa endpoint menghitung saldo dengan rumus berbeda sehingga kasus kredit bulan lalu bisa hilang saat bulan berikutnya dibayar pas.

Contoh kasus:

- Tagihan Juni 2026: Rp66.000
- Dibayar Juni 2026: Rp70.000
- Kredit Juni: Rp4.000
- Tagihan Juli 2026: Rp69.000
- Tagihan efektif Juli: Rp65.000
- Dibayar Juli 2026: Rp65.000
- Status Juli harus lunas

## File Terkait

- `lib/payment-ledger.ts`: service utama untuk rebuild saldo efektif tagihan.
- `app/api/pelunasan/route.ts`: input pembayaran baru.
- `app/api/pembayaran/[id]/route.ts`: revisi pembayaran.
- `app/api/pelunasan/list/route.ts`: list riwayat pelunasan dan status lunas.
- `scripts/repair-payment-ledger.ts`: repair/backfill saldo ledger secara aman.

## Konsep Data

### Tagihan

Field penting:

- `totalTagihan`: nominal tagihan periode berjalan, tanpa carry-over.
- `tagihanLalu`: saldo dari periode sebelumnya. Nilai positif berarti kurang bayar, nilai negatif berarti kredit/lebih bayar.
- `sudahBayar`: total alokasi pembayaran ke principal tagihan ini dari `DetailPembayaran`.
- `belumBayar`: sisa efektif yang masih harus dibayar. Setelah ledger baru, nilai ini mengikuti `max(sisaKurang, 0)`.
- `sisaKurang`: saldo akhir periode. Nilai positif berarti masih kurang, `0` berarti pas/lunas, negatif berarti kredit.
- `statusBayar`: `PAID` jika `sisaKurang <= 0`, selain itu `UNPAID`.

### Pembayaran

`Pembayaran.jumlahBayar` menyimpan nominal transaksi yang benar-benar dibayar pelanggan.

### DetailPembayaran

`DetailPembayaran.jumlahTerbayar` menyimpan alokasi pembayaran ke principal tagihan. Alokasi ini sengaja tidak selalu sama dengan `Pembayaran.jumlahBayar`, karena pembayaran bisa lebih besar dari principal.

Contoh:

- `Pembayaran.jumlahBayar = 70000`
- `DetailPembayaran.jumlahTerbayar = 66000`
- Selisih `4000` adalah kredit di periode anchor pembayaran.

## Rumus Ledger

Untuk setiap pelanggan, tagihan dihitung urut dari periode lama ke baru:

```txt
extraCredit =
  sum(Pembayaran.jumlahBayar yang anchor ke tagihan ini)
  - sum(DetailPembayaran untuk pembayaran tersebut)

sisaKurang =
  tagihanLalu
  + totalTagihan
  + denda
  - sudahBayar
  - extraCredit

tagihanLalu periode berikutnya = sisaKurang periode ini
statusBayar = sisaKurang <= 0 ? PAID : UNPAID
belumBayar = max(sisaKurang, 0)
```

`extraCredit` hanya dihitung jika selisihnya positif. Jika pembayaran kurang, tidak ada kredit tambahan; kekurangan akan muncul sebagai `sisaKurang > 0`.

## Skenario

### Bayar Pas

```txt
tagihanLalu = 0
totalTagihan = 69000
sudahBayar = 69000
extraCredit = 0
sisaKurang = 0
statusBayar = PAID
```

### Bayar Kurang

```txt
tagihanLalu = 0
totalTagihan = 69000
sudahBayar = 65000
extraCredit = 0
sisaKurang = 4000
statusBayar = UNPAID
```

Periode berikutnya mendapat:

```txt
tagihanLalu = 4000
```

### Bayar Lebih

```txt
tagihanLalu = 0
totalTagihan = 66000
Pembayaran.jumlahBayar = 70000
DetailPembayaran.jumlahTerbayar = 66000
extraCredit = 4000
sisaKurang = -4000
statusBayar = PAID
```

Periode berikutnya mendapat:

```txt
tagihanLalu = -4000
```

### Bulan Berikutnya Dibayar Setelah Dipotong Kredit

```txt
tagihanLalu = -4000
totalTagihan = 69000
sudahBayar = 65000
extraCredit = 0
sisaKurang = 0
statusBayar = PAID
```

## Alur Input Pembayaran

1. Endpoint `POST /api/pelunasan` menerima pembayaran.
2. Sistem membuat record `Pembayaran`.
3. Nominal dialokasikan ke `DetailPembayaran` berdasarkan tagihan lama ke baru, sampai principal terpenuhi.
4. Jika ada sisa nominal setelah principal terpenuhi, sisa itu dihitung sebagai `extraCredit` oleh ledger.
5. `rebuildPaymentLedger` dipanggil untuk pelanggan terkait dari periode anchor ke depan.
6. Field saldo tagihan diperbarui secara konsisten.

## Alur Revisi Pembayaran

1. Endpoint `PATCH /api/pembayaran/[id]` mengubah header pembayaran.
2. Detail alokasi lama untuk pembayaran tersebut dihapus.
3. Detail alokasi baru dibuat ulang.
4. `rebuildPaymentLedger` dipanggil untuk pelanggan terkait dari periode anchor ke depan.
5. Status dan saldo periode terdampak diperbarui.

## Repair Ledger

Script repair digunakan untuk memperbaiki data lama tanpa menghapus transaksi.

Gunakan CLI argument agar mode dan filter terlihat jelas di command history.

### Dry-run Satu Pelanggan

```powershell
npm run repair:payment-ledger -- --dry-run --kode TBBU7432 --from 2026-07
```

### Apply Satu Pelanggan

```powershell
npm run repair:payment-ledger -- --force --kode TBBU7432 --from 2026-07
```

### Filter yang Didukung

- `--pelanggan-id <id>`
- `--kode <kode>`
- `--nama <nama>`
- `--from <YYYY-MM>`
- `--all`
- `--dry-run`
- `--force` atau `--apply`

### Apply Semua Pelanggan

Apply semua pelanggan harus eksplisit:

```powershell
npm run repair:payment-ledger -- --dry-run --all
```

Jika hasil dry-run aman:

```powershell
npm run repair:payment-ledger -- --force --all
```

Gunakan dry-run terlebih dahulu sebelum apply massal. Env fallback masih didukung untuk kebutuhan automation lama: `DRY_RUN`, `FORCE`, `ALLOW_ALL`, `KODE`, `NAMA`, `PELANGGAN_ID`, dan `FROM_PERIODE`.

## Praktik Aman

- Jangan menghitung status lunas dari `Pembayaran.jumlahBayar >= totalTagihan`.
- Gunakan `sisaKurang <= 0` sebagai status efektif lunas.
- Jangan mengalokasikan overpay langsung ke `DetailPembayaran` melebihi principal tagihan.
- Jangan membuat rumus saldo baru di endpoint lain; gunakan `rebuildPaymentLedger` atau field hasil ledger.
- Untuk laporan, baca `tagihanLalu`, `sudahBayar`, `belumBayar`, dan `sisaKurang` yang sudah tersimpan.

## Catatan Laporan

Beberapa endpoint laporan lama masih memiliki kalkulasi sendiri. Jika laporan perlu dibuat sepenuhnya konsisten, arahkan laporan untuk membaca field hasil ledger, bukan menghitung ulang dari `Pembayaran.jumlahBayar` saja.
