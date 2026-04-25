// Minimal RFC 5545 (iCalendar) writer.
// We emit DTSTART/DTEND in UTC (Z suffix) so calendar clients render in the
// subscriber's local timezone. No VTIMEZONE block needed — every modern
// client (Google, Apple, Outlook 2010+) handles UTC events correctly.

export interface ICSEvent {
  uid: string;
  dtstart: string; // ISO timestamptz
  dtend: string; // ISO timestamptz
  summary: string;
  description?: string;
  location?: string;
  status?: "CONFIRMED" | "CANCELLED" | "TENTATIVE";
}

export interface ICSCalendarOptions {
  prodId: string;
  calName: string;
  timezone?: string; // X-WR-TIMEZONE hint for clients
  events: ICSEvent[];
}

// RFC 5545 §3.3.11 text-value escaping.
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

// RFC 5545 §3.1 line folding: lines must not exceed 75 octets.
// Continuation lines start with a single space (or tab).
function foldLine(line: string): string {
  // Octet length for UTF-8 strings (most barbershop names are ASCII anyway).
  if (Buffer.byteLength(line, "utf8") <= 75) return line;
  const out: string[] = [];
  let buf = "";
  for (const ch of line) {
    const next = buf + ch;
    if (Buffer.byteLength(next, "utf8") > 75) {
      out.push(buf);
      buf = " " + ch;
    } else {
      buf = next;
    }
  }
  if (buf.length) out.push(buf);
  return out.join("\r\n");
}

// 2026-04-27T08:00:00.000Z -> 20260427T080000Z
function fmtUtc(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export function buildICS(opts: ICSCalendarOptions): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${opts.prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${escapeText(opts.calName)}`),
  ];
  if (opts.timezone) lines.push(`X-WR-TIMEZONE:${opts.timezone}`);

  const now = fmtUtc(new Date().toISOString());

  for (const e of opts.events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${fmtUtc(e.dtstart)}`);
    lines.push(`DTEND:${fmtUtc(e.dtend)}`);
    lines.push(foldLine(`SUMMARY:${escapeText(e.summary)}`));
    if (e.description) lines.push(foldLine(`DESCRIPTION:${escapeText(e.description)}`));
    if (e.location) lines.push(foldLine(`LOCATION:${escapeText(e.location)}`));
    if (e.status) lines.push(`STATUS:${e.status}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  // RFC 5545 §3.1: lines MUST be terminated by CRLF; trailing CRLF is conventional.
  return lines.join("\r\n") + "\r\n";
}
