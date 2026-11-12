import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PKonek Citizen Platform",
  description: "Report civic issues and track resolutions in Pasig City.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/citizen/styles.css" />
        <link rel="icon" type="image/svg+xml" href="/citizen/favicon.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
