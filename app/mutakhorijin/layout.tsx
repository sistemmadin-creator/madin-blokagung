import React from 'react';
import { Barlow_Condensed, Playfair_Display } from 'next/font/google';

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-mutakhorijin-display',
  display: 'swap',
});

const playfairScript = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-mutakhorijin-script',
  display: 'swap',
});

export default function MutakhorijinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${barlowCondensed.variable} ${playfairScript.variable}`}>
      {children}
    </div>
  );
}
