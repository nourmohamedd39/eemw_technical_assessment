import "./globals.css";

export const metadata = {
  title: "DigiDocs",
  description: "A proof-of-concept corporate document repository.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
