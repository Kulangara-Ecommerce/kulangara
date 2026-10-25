"use client";

import OrdersManagement from "@/app/components/admin/OrdersManagement";

export default function AdminCancelledOrdersPage() {
  return <OrdersManagement group="unsuccessful" />;
}
