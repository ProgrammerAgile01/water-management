export const runtime = "nodejs";

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ background: "#fff" }}>{children}</body>
    </html>
  );
}
