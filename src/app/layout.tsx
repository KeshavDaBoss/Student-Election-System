import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SES — Student Election System",
  description:
    "Online election system for Army Public School Bolarum's student cabinet elections. By students, for students.",
  keywords: [
    "election",
    "student",
    "voting",
    "ranked choice",
    "Army Public School",
    "Bolarum",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider
          appearance={{
            elements: {
              footer: { display: "none" },
              footerAction: { display: "none" },
              poweredByFooter: { display: "none" },
              devModeBanner: { display: "none" },
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
