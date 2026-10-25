import type { Metadata } from "next";
import { Cairo, Plus_Jakarta_Sans, Sora } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { FeedbackProvider } from "@/components/ui/Feedback";
import { CurrencyProvider } from "@/lib/currency";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { THEME_SCRIPT } from "@/lib/theme";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

// Arabic letters (used when the language is Arabic)
const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic"],
});

// Display font for titles and amounts
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${jakarta.variable} ${sora.variable} ${cairo.variable} antialiased`}>
        <LanguageProvider>
          <FeedbackProvider>
            <AuthProvider>
              <CurrencyProvider>
                <AppShell>{children}</AppShell>
              </CurrencyProvider>
            </AuthProvider>
          </FeedbackProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
