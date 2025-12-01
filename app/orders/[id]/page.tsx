"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Separator } from "@/app/components/ui/separator";
import { IOrder, IOrderItem, ITrackingHistoryItem } from "@/app/types/order.type";
import { OrderTrackingComponent } from "@/app/components/ui/OrderTracking";
import ReviewModal from "@/app/components/ui/ReviewModal";
import reviewService from "@/app/services/review.service";
import { ICreateReviewData, IUpdateReviewData } from "@/app/types/review.type";
import orderService from "@/app/services/order.service";
import { FiArrowLeft } from "react-icons/fi";
import { useRouter } from "next/navigation";

interface ActualOrderApiResponse {
  data: {
    data: IOrder;
  };
}

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params["id"] as string;
  const [order, setOrder] = useState<IOrder | null>(null);
  const [tracking, setTracking] = useState<ITrackingHistoryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingProductId, setRatingProductId] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await orderService.getOrder(orderId);
      setOrder((response as unknown as ActualOrderApiResponse).data.data);
    } catch (error) {
      console.error("Error loading order:", error);
      setError("Failed to load order details");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const loadTracking = useCallback(async () => {
    try {
      const response = await orderService.trackOrder(orderId);
      if (response.status === "success") {
        setTracking(response.data.history || []);
      }
    } catch (error) {
      console.error("Error loading tracking:", error);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId, loadOrder]);

  const handleCancelOrder = async () => {
    if (!order) return;

    try {
      setLoading(true);
      await orderService.cancelOrder(order.id);
      // Reload order to get updated status
      await loadOrder();
    } catch (error) {
      console.error("Error cancelling order:", error);
      setError("Failed to cancel order");
    } finally {
      setLoading(false);
    }
  };

  const handleTrackOrder = async () => {
    await loadTracking();
  };

  const handleRateProduct = (productId: string) => {
    setRatingProductId(productId);
    setRatingModalOpen(true);
  };

  const submitReview = async (data: ICreateReviewData) => {
    if (!ratingProductId) return;
    try {
      setIsSubmittingReview(true);
      await reviewService.createReview(ratingProductId, data);
      setRatingModalOpen(false);
    } catch (e) {
      console.error('Error submitting review', e);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "outline";
      case "CONFIRMED":
        return "secondary";
      case "PROCESSING":
        return "secondary";
      case "SHIPPED":
        return "default";
      case "DELIVERED":
        return "default";
      default:
        return "destructive";
    }
  };

  const getPaymentStatusVariant = (status: string) => {
    switch (status) {
      case "PAID":
        return "default";
      case "PENDING":
        return "outline";
      default:
        return "destructive";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl mt-30">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading order details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl mt-30">
        <Card>
          <CardContent className="text-center py-12">
            <h1 className="text-2xl font-semibold mb-4">Order Not Found</h1>
            <p className="text-muted-foreground mb-6">
              {error || "The order you're looking for doesn't exist."}
            </p>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // compute delivered date for messaging
  const deliveredAt = order.deliveredAt || tracking.find(t => t.status === 'DELIVERED')?.createdAt || null;
  const deliveredDate = deliveredAt ? new Date(deliveredAt) : null;
  const today = new Date();
  const diffDays = deliveredDate ? Math.floor((today.getTime() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isReturnEligible = deliveredDate ? diffDays !== null && diffDays <= 30 : false;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl mt-16 sm:mt-24">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => router.back()} 
        className="mb-3 sm:mb-4 -ml-2 text-xs sm:text-sm px-2 sm:px-4"
      >
        <FiArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
        <span className="hidden min-[375px]:inline">Back to Orders</span>
        <span className="min-[375px]:hidden">Back</span>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-6">
          {/* Order Header with Status */}
          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col min-[375px]:flex-row min-[375px]:items-start min-[375px]:justify-between gap-2 min-[375px]:gap-0 mb-3 sm:mb-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 break-words">Order #{order.orderNumber}</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
                <Badge variant={getStatusVariant(order.status)} className="text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap self-start min-[375px]:self-auto">
                  {order.status}
                </Badge>
              </div>
              
              {deliveredDate && (
                <Alert className={isReturnEligible ? "border-blue-200 bg-blue-50" : "border-orange-200 bg-orange-50"}>
                  <AlertDescription className="text-xs sm:text-sm">
                    <strong>Delivery Date:</strong> {deliveredDate.toLocaleDateString(undefined, { 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                    <span className={`ml-1 sm:ml-2 block min-[375px]:inline ${isReturnEligible ? "text-blue-700" : "text-orange-700"}`}>
                      {isReturnEligible ? (
                        <>• Eligible for return/exchange (30 days)</>
                      ) : (
                        <>• Return/exchange period expired</>
                      )}
                    </span>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg">Order Items ({order.items.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-2 sm:pt-0 space-y-3 sm:space-y-4">
              {order.items.map((item: IOrderItem, index: number) => (
                <div key={index}>
                  <div className="flex flex-col min-[375px]:flex-row gap-2 sm:gap-4">
                    <div className="relative w-20 h-20 min-[375px]:w-24 min-[375px]:h-24 rounded-lg border overflow-hidden flex-shrink-0 bg-muted self-start">
                      <Image
                        src={item.product?.images?.[0]?.url || "/images/coming-soon.jpg"}
                        alt={item.product?.name || "Product"}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base break-words">{item.product?.name}</h3>
                      <div className="flex flex-wrap gap-1.5 sm:gap-3 mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
                        <span>Size: {item.variant?.size || "N/A"}</span>
                        <span className="hidden min-[375px]:inline">•</span>
                        <span>Color: {item.variant?.color || "Standard"}</span>
                        <span className="hidden min-[375px]:inline">•</span>
                        <span>Qty: {item.quantity}</span>
                      </div>
                      {order.status === 'DELIVERED' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-2 sm:mt-3 text-xs sm:text-sm h-7 sm:h-9 px-2 sm:px-3" 
                          onClick={() => handleRateProduct(item.product?.id || item.productId)}
                        >
                          Rate this product
                        </Button>
                      )}
                    </div>
                    <div className="text-left min-[375px]:text-right self-start min-[375px]:self-auto">
                      <p className="font-bold text-base sm:text-lg">₹{(item.price * item.quantity).toLocaleString()}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">₹{item.price.toLocaleString()} each</p>
                    </div>
                  </div>
                  {index < order.items.length - 1 && <Separator className="mt-3 sm:mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Shipping & Payment Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base">Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-2 sm:pt-0 space-y-1">
                <p className="font-semibold text-sm sm:text-base">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                <p className="text-xs sm:text-sm text-muted-foreground break-words">{order.shippingAddress.address}</p>
                {order.shippingAddress.apartment && (
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">{order.shippingAddress.apartment}</p>
                )}
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">{order.shippingAddress.phone}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-2 sm:pt-0 space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-1">
                  <span className="text-xs sm:text-sm text-muted-foreground">Payment Method</span>
                  <span className="font-medium text-xs sm:text-sm uppercase break-words">{order.paymentMethod}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center flex-wrap gap-1">
                  <span className="text-xs sm:text-sm text-muted-foreground">Payment Status</span>
                  <Badge variant={getPaymentStatusVariant(order.paymentStatus)} className="text-xs">
                    {order.paymentStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Summary & Tracking */}
        <div className="space-y-3 sm:space-y-6">
          {/* Order Summary */}
          <Card className="sticky top-16 sm:top-24">
            <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-2 sm:pt-0 space-y-3 sm:space-y-4">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">₹{order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium text-green-600">
                    {order.shippingFee === 0 ? "FREE" : `₹${order.shippingFee.toLocaleString()}`}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">₹{order.taxAmount.toLocaleString()}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm text-green-600">
                    <span>Discount</span>
                    <span className="font-medium">-₹{order.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between pt-1 sm:pt-2">
                  <span className="font-semibold text-base sm:text-lg">Total</span>
                  <span className="font-bold text-xl sm:text-2xl">₹{order.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="space-y-1.5 sm:space-y-2">
                <Button onClick={handleTrackOrder} variant="outline" className="w-full text-xs sm:text-sm h-8 sm:h-10">
                  Refresh Tracking
                </Button>
                {order.status === "PENDING" && (
                  <Button 
                    onClick={handleCancelOrder} 
                    variant="destructive" 
                    disabled={loading} 
                    className="w-full text-xs sm:text-sm h-8 sm:h-10"
                  >
                    {loading ? "Cancelling..." : "Cancel Order"}
                  </Button>
                )}
                <Button 
                  onClick={() => (window.location.href = "/")} 
                  variant="outline" 
                  className="w-full text-xs sm:text-sm h-8 sm:h-10"
                >
                  Continue Shopping
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Order Tracking */}
          <Card className="flex flex-col h-[280px] min-[375px]:h-[300px] sm:h-[350px] lg:h-[400px]">
            <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3 flex-shrink-0">
              <CardTitle className="text-base sm:text-lg">Order Tracking</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 flex-1 overflow-y-auto min-h-0">
              <OrderTrackingComponent tracking={tracking} currentStatus={order.status} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={ratingModalOpen}
        onClose={() => setRatingModalOpen(false)}
        productId={ratingProductId || ''}
        onSubmit={submitReview as (data: ICreateReviewData | IUpdateReviewData) => void}
        isLoading={isSubmittingReview}
      />
    </div>
  );
}
