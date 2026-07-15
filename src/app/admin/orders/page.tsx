import { getRestaurantSettings } from "@/actions/settings";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import OrdersClient from "./components/OrdersClient";

export default async function OrdersPage() {
  const settings = await getRestaurantSettings();
  return <OrdersClient currency={settings?.currency ?? DEFAULT_CURRENCY} />;
}
