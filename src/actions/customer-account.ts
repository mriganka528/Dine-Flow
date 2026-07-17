"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_SESSION_COOKIE,
  deleteCustomerSession,
} from "@/lib/customer-session";

export async function logoutCustomer() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (sessionId) {
    await deleteCustomerSession(sessionId);
  }

  cookieStore.set({
    name: CUSTOMER_SESSION_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });

  return { success: true };
}

export async function deleteCustomerAccount() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (!sessionId) {
    return { success: false, error: "Not authenticated" };
  }

  const session = await prisma.customerSession.findUnique({
    where: { sessionId },
  });

  if (!session) {
    return { success: false, error: "Session not found" };
  }

  const customerId = session.customerId;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { email: true },
  });

  if (!customer) {
    return { success: false, error: "Customer not found" };
  }

  await prisma.$transaction(async (tx: any) => {
    await tx.rating.deleteMany({ where: { customerId } });
    await tx.orderItem.deleteMany({
      where: { order: { customerId } },
    });
    await tx.order.deleteMany({ where: { customerId } });
    const cart = await tx.cart.findUnique({ where: { customerId } });
    if (cart) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.delete({ where: { id: cart.id } });
    }
    await tx.address.deleteMany({ where: { customerId } });
    await tx.customerSession.deleteMany({ where: { customerId } });
    if (customer.email) {
      await tx.emailOtp.deleteMany({ where: { email: customer.email } });
    }
    await tx.customer.delete({ where: { id: customerId } });
  });

  cookieStore.set({
    name: CUSTOMER_SESSION_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });

  return { success: true };
}
