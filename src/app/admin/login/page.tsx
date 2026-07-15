import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Admin Login | FoodBot",
  description: "Secure admin access for FoodBot.",
};

export default function AdminLoginPage() {
  return <LoginClient />;
}
