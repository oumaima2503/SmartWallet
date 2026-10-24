import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { FeedbackProvider } from "@/components/ui/Feedback";
import { CurrencyProvider } from "@/lib/currency";
import { AuthProvider } from "@/lib/auth";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartWallet",
  description: "AI-powered personal finance manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} antialiased`}>
        <FeedbackProvider>
          <AuthProvider>
            <CurrencyProvider>
              <AppShell>{children}</AppShell>
            </CurrencyProvider>
          </AuthProvider>
        </FeedbackProvider>
      </body>
    </html>
  );
}
