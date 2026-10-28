import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Madin Al Amiriyyah Blokagung - Sistem Database & Presensi KBM",
  description: "Sistem Informasi Terpadu Database Santri, Dewan Asatidz, Kurikulum, Formasi Kelas, Presensi KBM 4 Jam, dan Muhafadzoh Pondok Pesantren Darussalam Blokagung",
  icons: {
    icon: '/logo-madin.png',
    shortcut: '/logo-madin.png',
    apple: '/logo-madin.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
