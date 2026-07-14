type MailMessage = {
  to: string;
  subject: string;
  body: string;
};

// Dev-only mailer. Zamiast realnej wysyłki loguje wiadomość do konsoli serwera.
// To jedyny punkt do podmiany przy wdrożeniu prawdziwej poczty (Resend/SMTP) —
// wystarczy zaimplementować transport wewnątrz sendMail, reszta kodu bez zmian.
export async function sendMail({ to, subject, body }: MailMessage): Promise<void> {
  console.log(
    [
      "",
      "──────────────────────────────────────────────────────────────",
      "📧  [DEV MAIL] Wiadomość (niewysłana — tryb deweloperski)",
      `    Do:     ${to}`,
      `    Temat:  ${subject}`,
      "    Treść:",
      body
        .split("\n")
        .map((line) => `      ${line}`)
        .join("\n"),
      "──────────────────────────────────────────────────────────────",
      "",
    ].join("\n")
  );
}

function appUrl(): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export async function sendPasswordSetupEmail(
  to: string,
  token: string,
  variant: "invite" | "reset"
): Promise<void> {
  const link = `${appUrl()}/set-password?token=${encodeURIComponent(token)}`;

  if (variant === "invite") {
    await sendMail({
      to,
      subject: "Zaproszenie do FTE Planner — ustaw hasło",
      body: [
        "Cześć,",
        "",
        "Zostało dla Ciebie utworzone konto w FTE Planner.",
        "Aby dokończyć konfigurację i zalogować się, ustaw hasło pod poniższym linkiem:",
        "",
        link,
        "",
        "Link jest ważny przez 7 dni.",
      ].join("\n"),
    });
    return;
  }

  await sendMail({
    to,
    subject: "Reset hasła — FTE Planner",
    body: [
      "Cześć,",
      "",
      "Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w FTE Planner.",
      "Ustaw nowe hasło pod poniższym linkiem:",
      "",
      link,
      "",
      "Link jest ważny przez 1 godzinę. Jeśli to nie Ty prosiłeś o reset, zignoruj tę wiadomość.",
    ].join("\n"),
  });
}
