import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Invoq — Invoice in 60 Seconds",
  description:
    "The fastest invoice tool alive. Speak or type. Preview. Sign. Download. Done in 60 seconds.",
  keywords: [
    "invoice generator",
    "AI invoice",
    "voice invoice",
    "freelancer tools",
    "PDF invoice",
    "invoq",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#FFFFFF",
              color: "#1A1A18",
              border: "1px solid #E8E6E0",
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: "14px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            },
            success: {
              iconTheme: { primary: "#4A7C59", secondary: "#FFFFFF" },
            },
            error: {
              iconTheme: { primary: "#C0392B", secondary: "#FFFFFF" },
            },
          }}
        />
      </body>
    </html>
  );
}
