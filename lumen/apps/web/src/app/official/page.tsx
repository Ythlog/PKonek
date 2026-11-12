import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.cwd(), "..", "..", "..");
const source = fs.readFileSync(
  path.join(projectRoot, "frontend", "staff", "official.html"),
  "utf8",
);
const markup = source
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
  .replace(/<!doctype[^>]*>/i, "")
  .replace(/<html\b[^>]*>/i, "")
  .replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, "")
  .replace(/<\/body\s*>/i, "");

export const metadata = {
  title: "PKonek Official Dashboard",
  description: "Local government complaint dashboard for Pasig City.",
};

export default function OfficialDashboard() {
  return <div dangerouslySetInnerHTML={{ __html: markup }} />;
}
