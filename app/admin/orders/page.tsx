"use client";

import {
  useAdminOrders,
  useUpdateOrderStatus,
  useUpdatePaymentStatus,
} from "@/app/hooks/useOrders";
import { useState } from "react";
import { IOrder, IOrderFilters } from "@/app/types/order.type";
import { useAuth } from "@/app/hooks/useAuth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/app/components/layout/AdminLayout";
import { useAdminUsers } from "@/app/hooks/useAdminUserManagement";
import { FiSearch } from "react-icons/fi";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { MoreVertical, MapPin, Phone, User } from "lucide-react";

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "DELIVERY_PARTNER"];
const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];
const PAYMENT_STATUSES = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
  "PARTIAL_REFUND",
];
const PAYMENT_METHODS = ["RAZORPAY", "COD"];

export default function AdminOrdersPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [filters, setFilters] = useState<IOrderFilters>({
    page: 1,
    limit: 10,
    status: "",
    paymentStatus: "",
    paymentMethod: "",
    search: "",
  });

  const { data: ordersData, isLoading: isOrdersLoading } =
    useAdminOrders(filters);
  const updateStatusMutation = useUpdateOrderStatus();
  const updatePaymentStatusMutation = useUpdatePaymentStatus();
  const [editing, setEditing] = useState<{ [orderId: string]: boolean }>({});
  const [editingPayment, setEditingPayment] = useState<{
    [orderId: string]: boolean;
  }>({});
  const [statusDraft, setStatusDraft] = useState<{ [orderId: string]: string }>(
    {}
  );
  const [paymentStatusDraft, setPaymentStatusDraft] = useState<{
    [orderId: string]: string;
  }>({});
  const { data: usersData, isLoading: isUsersLoading } = useAdminUsers({
    limit: 1000,
  });
  const users = usersData?.data || [];

  // Extract orders and meta from the response
  const orders = ordersData?.data || [];
  const meta = ordersData?.meta || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  // Helper to get user info by userId
  const getUserInfo = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return { name: userId, email: "" };
    return { name: `${user.firstName} ${user.lastName}`, email: user.email };
  };

  // Helper to get product names (truncated)
  const getProductNames = (items: IOrder["items"]) => {
    if (!items || items.length === 0) return "-";
    return items.map((item) => item.product?.name || "").join(", ");
  };

  const getTotalQuantity = (items: IOrder["items"]) => {
    return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  };

  const getOrderSizes = (items: IOrder["items"]) => {
    if (!items || items.length === 0) return "-";
    const sizes = items.map((item) => item.size ?? item.variant?.size ?? "—");
    return [...new Set(sizes)].join(", ");
  };

  const getOrderFit = (items: IOrder["items"]) => {
    if (!items || items.length === 0) return "—";
    const fits = items
      .map((item) => item.fit ?? item.variant?.fit)
      .filter(Boolean) as string[];
    const uniqueFits = [...new Set(fits)];
    if (uniqueFits.length === 0) return "—";
    return uniqueFits
      .map((f) => (f === "OVERSIZED" ? "Oversized" : "Normal"))
      .join(", ");
  };

  // Helper to get mobile number from shipping address
  const getMobileNumber = (order: IOrder) => {
    return order.shippingAddress?.phone || "-";
  };

  const handleFilterChange = (
    key: keyof IOrderFilters,
    value: string | number
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const getOrderStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      DELIVERED: "default",
      SHIPPED: "secondary",
      PROCESSING: "secondary",
      CONFIRMED: "outline",
      CANCELLED: "destructive",
      PENDING: "outline",
    };
    return variants[status] || "outline";
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PAID: "default",
      FAILED: "destructive",
      REFUNDED: "secondary",
      PARTIAL_REFUND: "secondary",
      PENDING: "outline",
    };
    return variants[status] || "outline";
  };

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/(auth)/login?redirect=/admin/orders");
      } else if (!user || !ALLOWED_ROLES.includes(user.role)) {
        router.replace("/");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (
    isLoading ||
    isOrdersLoading ||
    isUsersLoading ||
    !isAuthenticated ||
    !user ||
    !ALLOWED_ROLES.includes(user.role)
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-base font-medium text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-white px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center pt-4 sm:pt-6 mb-6 pb-4 border-b">
          <h1 className="text-2xl font-bold">
            Orders Management
          </h1>
        </div>

        <div className="space-y-6 sm:space-y-8 pb-8">
          {/* Filters */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base font-semibold">Filters</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Filter orders by status, payment, or search</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="search"
                      type="text"
                      value={filters.search}
                      onChange={(e) =>
                        handleFilterChange("search", e.target.value)
                      }
                      placeholder="Search by order number or user"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={filters.status}
                    onChange={(e) => handleFilterChange("status", e.target.value)}
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                  <option value="">All Statuses</option>
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <select
                    id="paymentStatus"
                    value={filters.paymentStatus}
                    onChange={(e) =>
                      handleFilterChange("paymentStatus", e.target.value)
                    }
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                  <option value="">All Payment Statuses</option>
                  {PAYMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <select
                    id="paymentMethod"
                    value={filters.paymentMethod}
                    onChange={(e) =>
                      handleFilterChange("paymentMethod", e.target.value)
                    }
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">All Payment Methods</option>
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="limit">Limit</Label>
                  <select
                    id="limit"
                    value={filters.limit}
                    onChange={(e) =>
                      handleFilterChange("limit", parseInt(e.target.value))
                    }
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setFilters({
                        page: 1,
                        limit: 10,
                        status: "",
                        paymentStatus: "",
                        paymentMethod: "",
                        search: "",
                      })
                    }
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base font-semibold">All Orders</CardTitle>
              {ordersData && meta && (
                <CardDescription className="text-sm text-muted-foreground">
                  Showing {(meta.page - 1) * meta.limit + 1} to{" "}
                  {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}{" "}
                  orders
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {isOrdersLoading ? (
                <div className="text-center py-12 px-4">
                  <p className="text-muted-foreground font-medium text-sm">Loading orders...</p>
                </div>
              ) : !orders || orders.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-muted-foreground text-sm">No orders found.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table className="min-w-[1000px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Product(s)</TableHead>
                          <TableHead>Fit</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Total (₹)</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>ETA</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order: IOrder) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono font-medium">
                              {order.orderNumber}
                            </TableCell>
                            <TableCell>
                            {(() => {
                              const info = getUserInfo(order.userId);
                              return (
                                <div>
                                  <div className="font-medium text-black">
                                    {info.name}
                                  </div>
                                  {info.email && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      {info.email}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>
                            <TableCell className="text-sm">
                              {getProductNames(order.items)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {getOrderFit(order.items)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {getOrderSizes(order.items)}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {getTotalQuantity(order.items)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {getMobileNumber(order)}
                            </TableCell>
                            <TableCell>
                            {editing[order.id] ? (
                              <select
                                className="w-full px-3 py-2 border border-black bg-white text-black font-medium focus:outline-none"
                                value={statusDraft[order.id] ?? order.status}
                                onChange={(e) =>
                                  setStatusDraft((s) => ({
                                    ...s,
                                    [order.id]: e.target.value,
                                  }))
                                }
                              >
                                {ORDER_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                              ) : (
                                <Badge variant={getOrderStatusBadge(order.status)}>
                                  {order.status}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                            {editingPayment[order.id] ? (
                              <select
                                className="w-full px-3 py-2 border border-black bg-white text-black font-medium focus:outline-none"
                                value={
                                  paymentStatusDraft[order.id] ??
                                  order.paymentStatus
                                }
                                onChange={(e) =>
                                  setPaymentStatusDraft((s) => ({
                                    ...s,
                                    [order.id]: e.target.value,
                                  }))
                                }
                              >
                                {PAYMENT_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                              ) : (
                                <Badge variant={getPaymentStatusBadge(order.paymentStatus)}>
                                  {order.paymentStatus}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              ₹{order.totalAmount}
                            </TableCell>
                            <TableCell className="text-sm font-medium uppercase">
                              {order.paymentMethod}
                            </TableCell>
                            <TableCell className="text-sm">
                              {order.estimatedDelivery
                                ? new Date(
                                    order.estimatedDelivery
                                  ).toLocaleDateString()
                                : "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                            <div className="flex flex-col gap-2">
                                {editing[order.id] ? (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        updateStatusMutation.mutate({
                                          orderId: order.id,
                                          status:
                                            statusDraft[order.id] ?? order.status,
                                        });
                                        setEditing((e) => ({
                                          ...e,
                                          [order.id]: false,
                                        }));
                                      }}
                                      disabled={updateStatusMutation.isPending}
                                    >
                                      {updateStatusMutation.isPending
                                        ? "Saving..."
                                        : "Save"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        setEditing((e) => ({
                                          ...e,
                                          [order.id]: false,
                                        }))
                                      }
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setEditing((e) => ({
                                        ...e,
                                        [order.id]: true,
                                      }))
                                    }
                                  >
                                    Edit Status
                                  </Button>
                                )}

                                {editingPayment[order.id] ? (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        updatePaymentStatusMutation.mutate({
                                          orderId: order.id,
                                          paymentStatus:
                                            paymentStatusDraft[order.id] ??
                                            order.paymentStatus,
                                        });
                                        setEditingPayment((e) => ({
                                          ...e,
                                          [order.id]: false,
                                        }));
                                      }}
                                      disabled={
                                        updatePaymentStatusMutation.isPending
                                      }
                                    >
                                      {updatePaymentStatusMutation.isPending
                                        ? "Saving..."
                                        : "Save"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        setEditingPayment((e) => ({
                                          ...e,
                                          [order.id]: false,
                                        }))
                                      }
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setEditingPayment((e) => ({
                                        ...e,
                                        [order.id]: true,
                                      }))
                                    }
                                  >
                                    Edit Payment
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-80">
                                <DropdownMenuLabel className="font-semibold">Order Details</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                
                                <div className="px-2 py-3 space-y-3">
                                  <div className="flex items-start gap-2">
                                    <User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-muted-foreground">Customer Name</p>
                                      <p className="text-sm break-words">
                                        {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-start gap-2">
                                    <Phone className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-muted-foreground">Phone Number</p>
                                      <p className="text-sm">{order.shippingAddress?.phone || "-"}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-muted-foreground">Shipping Address</p>
                                      <p className="text-sm break-words">
                                        {order.shippingAddress?.address}
                                        {order.shippingAddress?.apartment && `, ${order.shippingAddress.apartment}`}
                                        <br />
                                        {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.pincode}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {orders.length > 0 && (
                    <div className="mt-6 px-4 sm:px-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Label htmlFor="limitSelector" className="text-xs sm:text-sm">Show</Label>
                        <select
                          id="limitSelector"
                          value={filters.limit}
                          onChange={(e) =>
                            handleFilterChange("limit", Number(e.target.value))
                          }
                          className="flex h-9 items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                        </select>
                        <span className="text-xs sm:text-sm text-muted-foreground">entries</span>
                      </div>

                      <div className="text-xs sm:text-sm text-muted-foreground hidden md:block">
                        Showing {(meta.page - 1) * meta.limit + 1} to{" "}
                        {Math.min(meta.page * meta.limit, meta.total)} of{" "}
                        {meta.total} results
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(meta.page - 1)}
                          disabled={meta.page <= 1}
                        >
                          Previous
                        </Button>

                    {Array.from(
                      { length: Math.min(5, meta.totalPages) },
                      (_, i) => {
                        let pageNum;
                        if (meta.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (meta.page <= 3) {
                          pageNum = i + 1;
                        } else if (meta.page >= meta.totalPages - 2) {
                          pageNum = meta.totalPages - 4 + i;
                        } else {
                          pageNum = meta.page - 2 + i;
                        }

                          return (
                            <Button
                              key={pageNum}
                              variant={meta.page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                      }
                    )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(meta.page + 1)}
                          disabled={meta.page >= meta.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
