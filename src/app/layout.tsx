import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sarthak Clinic | सार्थक क्लिनिक",
  description: "Clinic information and visit requests for Sarthak Clinic.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="hi" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
