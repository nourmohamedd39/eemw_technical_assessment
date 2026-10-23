import "./globals.css";
import { DemoUserProvider } from "./components/DemoUserContext";

export const metadata = {
  title: "Unpile | Corporate document workspace",
  description: "Turn document clutter into clarity with Unpile.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><DemoUserProvider>{children}</DemoUserProvider></body>
    </html>
  );
}
