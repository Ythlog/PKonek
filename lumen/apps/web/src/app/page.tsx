import fs from "node:fs";
import path from "node:path";
import Script from "next/script";

const projectRoot = path.resolve(process.cwd(), "..", "..", "..");
const citizenHtml = fs.readFileSync(
  path.join(projectRoot, "frontend", "index.html"),
  "utf8",
);

// Keep the existing citizen prototype as the source of the page markup while
// Next.js serves it at the app's root route.
const citizenMarkup = citizenHtml
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
  .replace(/<\/body\s*>/i, "")
  .replace(/<!doctype[^>]*>/i, "")
  .replace(/<html\b[^>]*>/i, "")
  .replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, "");

export default function Home() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: citizenMarkup }} />
      <Script src="/citizen/app.js" strategy="afterInteractive" />
    </>
  );
}
