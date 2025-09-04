export async function sendWelcomeWA(phone: string, message: string) {
    if (!phone) return;
    try {
      await fetch(process.env.WA_API_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.WA_API_KEY!,
        },
        body: JSON.stringify({ phone, message }),
      });
    } catch {}
  }