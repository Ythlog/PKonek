import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.cwd(), "..", "..", "..");
const source = fs.readFileSync(
  path.join(projectRoot, "frontend", "staff", "admin.html"),
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
  title: "PKonek Pasig Admin Dashboard",
  description: "Citywide complaint monitoring and platform management.",
};

export default function PasigAdminDashboard() {
  return <div dangerouslySetInnerHTML={{ __html: markup }} />;
}
