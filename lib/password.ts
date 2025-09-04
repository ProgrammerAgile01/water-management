import bcrypt from "bcryptjs";

export function genTempPassword(len = 6) {
  // 6 digit angka biar mudah diketik
  return Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join("");
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}