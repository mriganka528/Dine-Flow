import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getRestaurantSettings } from "@/actions/settings";
import { getCustomerId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFoodRatingStatsMap, emptyRatingStats } from "@/lib/ratings";
import MenuClient from "./components/MenuClient";
import type { MenuCategory, MenuItem, MenuSettings } from "./components/types";

const demoCategories: MenuCategory[] = [
  { id: "demo-starters", name: "Starters" },
  { id: "demo-mains", name: "Mains" },
  { id: "demo-bowls", name: "Bowls" },
  { id: "demo-desserts", name: "Desserts" },
  { id: "demo-drinks", name: "Drinks" },
];

const demoItems: MenuItem[] = [
  {
    id: "demo-1",
    name: "Smoky Paneer Tikka",
    description: "Charred paneer, peppers, onions, and a bright mint chutney.",
    available: true,
    categoryId: "demo-starters",
    categoryName: "Starters",
    price: 249,
    imageUrl: null,
    tag: "Chef pick",
    prepTime: 18,
    rating: 0,
    ratingCount: 0,
  },
  {
    id: "demo-2",
    name: "Classic House Burger",
    description: "Toasted bun, crisp greens, spiced patty, cheese, and house sauce.",
    available: true,
    categoryId: "demo-mains",
    categoryName: "Mains",
    price: 329,
    imageUrl: null,
    tag: "Popular",
    prepTime: 20,
    rating: 0,
    ratingCount: 0,
  },
  {
    id: "demo-3",
    name: "Garden Protein Bowl",
    description: "Seasonal vegetables, grains, herbs, and lemon tahini dressing.",
    available: true,
    categoryId: "demo-bowls",
    categoryName: "Bowls",
    price: 289,
    imageUrl: null,
    tag: "Fresh",
    prepTime: 15,
    rating: 0,
    ratingCount: 0,
  },
  {
    id: "demo-4",
    name: "Berry Cream Slice",
    description: "Soft sponge layered with whipped cream and mixed berry compote.",
    available: true,
    categoryId: "demo-desserts",
    categoryName: "Desserts",
    price: 179,
    imageUrl: null,
    tag: "Sweet",
    prepTime: 8,
    rating: 0,
    ratingCount: 0,
  },
  {
    id: "demo-5",
    name: "Citrus Cooler",
    description: "Sparkling lime, orange, mint, and a gentle ginger finish.",
    available: true,
    categoryId: "demo-drinks",
    categoryName: "Drinks",
    price: 129,
    imageUrl: null,
    tag: "Chilled",
    prepTime: 5,
    rating: 0,
    ratingCount: 0,
  },
  {
    id: "demo-6",
    name: "Creamy Basil Pasta",
    description: "Penne tossed with basil cream, roasted vegetables, and parmesan.",
    available: false,
    categoryId: "demo-mains",
    categoryName: "Mains",
    price: 349,
    imageUrl: null,
    tag: "Returning soon",
    prepTime: 22,
    rating: 0,
    ratingCount: 0,
  },
];

const fallbackSettings: MenuSettings = {
  restaurantName: "Foodbot Kitchen",
  tagline: "Fast, fresh ordering with a menu that stays easy to explore.",
  currency: "INR",
  gstRate: 5,
  serviceCharge: 0,
  averagePrepTime: 25,
  acceptingOrders: true,
  dineInEnabled: true,
  deliveryEnabled: true,
};

export default async function MenuPage() {
  await connection();

  const customerId = await getCustomerId();
  if (!customerId) {
    redirect("/auth");
  }

  const [categories, foods, restaurantSettings, ratingStatsMap, orderCounts] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.food.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: true },
    }),
    getRestaurantSettings(),
    getFoodRatingStatsMap(),
    prisma.orderItem.groupBy({
      by: ["foodId"],
      _sum: { quantity: true },
    }),
  ]);

  const popularityMap = new Map(
    orderCounts.map((row) => [row.foodId, row._sum.quantity ?? 0]),
  );

  const liveCategories: MenuCategory[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  const liveItems: MenuItem[] = foods.map((food) => {
    const stats = ratingStatsMap.get(food.id) ?? emptyRatingStats();
    return {
      id: food.id,
      name: food.name,
      description:
        food.description?.trim() ||
        "Prepared fresh by the kitchen and ready to add to your order.",
      available: food.available,
      categoryId: food.categoryId ?? "uncategorized",
      categoryName: food.category?.name ?? "Uncategorized",
      price: food.price,
      imageUrl: food.imageUrl || null,
      tag: food.available ? "Available" : "Paused",
      prepTime: restaurantSettings?.averagePrepTime ?? fallbackSettings.averagePrepTime,
      rating: stats.average,
      ratingCount: stats.count,
      ratingDistribution: stats.distribution,
      popularity: popularityMap.get(food.id) ?? 0,
      createdAt: food.createdAt.toISOString(),
    };
  });

  const hasUncategorized = liveItems.some((item) => item.categoryId === "uncategorized");
  const menuCategories = liveItems.length
    ? [
        ...liveCategories,
        ...(hasUncategorized ? [{ id: "uncategorized", name: "Uncategorized" }] : []),
      ]
    : demoCategories;

  const settings: MenuSettings = restaurantSettings
    ? {
        restaurantName: restaurantSettings.restaurantName,
        tagline: restaurantSettings.tagline,
        currency: restaurantSettings.currency,
        gstRate: restaurantSettings.gstRate,
        serviceCharge: restaurantSettings.serviceCharge,
        averagePrepTime: restaurantSettings.averagePrepTime,
        acceptingOrders: restaurantSettings.orderMode === "ACCEPTING",
        dineInEnabled: restaurantSettings.dineInEnabled,
        deliveryEnabled: restaurantSettings.deliveryEnabled,
      }
    : fallbackSettings;

  return (
    <MenuClient
      items={liveItems.length ? liveItems : demoItems}
      categories={menuCategories}
      settings={settings}
      usingDemoData={liveItems.length === 0}
    />
  );
}
