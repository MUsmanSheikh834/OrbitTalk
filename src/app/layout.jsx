import "./globals.css";
import StoreProvider from "@/store/provider";

export const metadata = {
  title: "Chat App",
  description: "Real-time chat application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}