import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerId } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import OrderDetail from "./components/OrderDetail";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const customerId = await getCustomerId();
  if (!customerId) {
    redirect("/auth");
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, customerId },
    include: {
      address: true,
      orderItems: {
        include: { food: { select: { id: true, name: true, price: true } } },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const restaurant = await prisma.restaurant.findFirst({
    select: { restaurantName: true, averagePrepTime: true, phone: true, address: true, currency: true },
  });

  return (
    <OrderDetail
      initialOrder={JSON.parse(JSON.stringify(order))}
      restaurant={{
        name: restaurant?.restaurantName ?? "Foodbot Kitchen",
        prepTime: restaurant?.averagePrepTime ?? 20,
        phone: restaurant?.phone ?? "",
        address: restaurant?.address ?? "",
        currency: restaurant?.currency ?? "INR",
      }}
    />
  );
}
