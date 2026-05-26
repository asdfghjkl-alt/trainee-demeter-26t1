/**
 * Formats a Date object to the ICS datetime format (YYYYMMDDTHHMMSSZ)
 */
function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export interface IcsEventInput {
  title: string;
  description?: string;
  location?: string;
  startDate?: string | Date; // ISO string or Date object
  durationMinutes?: number; // defaults to 120 (2 hours)
}

/**
 * Generates an ICS file content string for a calendar event.
 */
export function generateIcsContent(input: IcsEventInput): string {
  const { title, description = "", location = "", startDate, durationMinutes = 120 } = input;

  // Use the provided date, or default to "now" if missing
  const start = startDate ? new Date(startDate) : new Date();
  
  // Calculate end time
  const end = new Date(start.getTime() + durationMinutes * 60000);

  // Format dates
  const dtstamp = formatIcsDate(new Date());
  const dtstart = formatIcsDate(start);
  const dtend = formatIcsDate(end);

  // Escape special characters for ICS
  const escapeIcs = (str: string) => str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rendezvous//Event//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${start.getTime()}-${Math.random().toString(36).substring(2, 11)}@rendezvous.app`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeIcs(title)}`,
  ];

  if (description) icsLines.push(`DESCRIPTION:${escapeIcs(description)}`);
  if (location) icsLines.push(`LOCATION:${escapeIcs(location)}`);

  icsLines.push("END:VEVENT");
  icsLines.push("END:VCALENDAR");

  // ICS lines must be separated by CRLF
  return icsLines.join("\r\n");
}

/**
 * Triggers a browser download of the ICS file.
 */
export function downloadIcsFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
