import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { FeedbackProvider } from "@/components/ui/Feedback";
import { CurrencyProvider } from "@/lib/currency";

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
          <CurrencyProvider>
            <div className="min-h-screen lg:flex">
              <Sidebar />
              <div className="min-w-0 flex-1">{children}</div>
            </div>
          </CurrencyProvider>
        </FeedbackProvider>
      </body>
    </html>
  );
}
