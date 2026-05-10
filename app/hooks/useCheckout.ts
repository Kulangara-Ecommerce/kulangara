import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IAddress } from "@/app/types/profile.type";
import { ICoupon } from "@/app/types/coupon.type";
import { ICheckoutFormData } from "@/app/types/checkout.type";
import cartService from "@/app/services/cart.service";
import productsService from "@/app/services/products.service";
import { ProfileService } from "@/app/services/profile.service";
import couponService from "@/app/services/coupon.service";
import orderService from "@/app/services/order.service";
import { IOrder } from "@/app/types/order.type";
import { toast } from "react-hot-toast";
import { AxiosError } from "axios";
import { getErrorMessage } from "@/app/lib/utils";
import { useRazorpayPayment } from "./useRazorpayPayment";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  clearCart as clearCartThunk,
  fetchCart as fetchCartThunk,
} from "../store/slices/cartSlice";

export const useCheckout = () => {
  const queryClient = useQueryClient();
  const {
    processRazorpayPaymentFromCart,
    paymentStatus,
    resetPaymentStatus,
  } = useRazorpayPayment();
  const dispatch = useAppDispatch();

  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [couponCode, setCouponCode] = useState("");

  // Use Redux cart state instead of duplicate React Query
  // This prevents double API calls and state sync issues
  const reduxCartState = useAppSelector((state) => state.cart);
  const cartItems = useMemo(() => reduxCartState.items || [], [reduxCartState.items]);
  const cartLoading = reduxCartState.loading;
  const cartError = reduxCartState.error ? { message: reduxCartState.error } : null;

  const {
    data: addressesData,
    isLoading: addressesLoading,
    error: addressesError,
  } = useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      const response = await ProfileService.getAddresses();
      return response.data.addresses;
    },
  });
  const addresses: IAddress[] = useMemo(
    () => addressesData || [],
    [addressesData]
  );

  useEffect(() => {
    if (addressesData && addressesData.length > 0) {
      const defaultAddress = addressesData.find(
        (addr: IAddress) => addr.isDefault
      );
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      }
    }
  }, [addressesData]);

  const [appliedCoupon, setAppliedCoupon] = useState<ICoupon | null>(null);

  const couponMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await couponService.validateCoupon(code);
      if (response.status === "success" && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || "Invalid coupon code");
      }
    },
    onSuccess: (coupon: ICoupon, code: string) => {
      setAppliedCoupon(coupon);
      setCouponCode(code);
      toast.success("Coupon applied!");
      couponMutation.reset();
    },
    onError: (error: Error | AxiosError) => {
      setAppliedCoupon(null);
      toast.error(getErrorMessage(error as AxiosError));
    },
  });

  const applyCoupon = async (code: string) => {
    if (!code.trim()) return false;
    try {
      await couponMutation.mutateAsync(code);
      return true;
    } catch {
      return false;
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    couponMutation.reset();
  };

  const orderMutation = useMutation({
    mutationFn: async ({
      paymentMethod,
      formData,
    }: {
      paymentMethod: string;
      formData?: ICheckoutFormData;
    }) => {
      if (!selectedAddressId && !formData?.firstName) {
        throw new Error(
          "Please select a shipping address or fill in address details"
        );
      }
      if (cartItems.length === 0) {
        throw new Error("Your cart is empty");
      }
      let addressId = selectedAddressId;
      if (!selectedAddressId && formData?.firstName) {
        try {
          const addressResponse = await ProfileService.createAddress({
            firstName: formData.firstName,
            lastName: formData.lastName,
            address: formData.address,
            apartment: formData.apartment,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            phone: formData.phone,
            isDefault: addresses && addresses.length === 0,
          });
          const createdAddresses = addressResponse.data?.addresses;
          if (createdAddresses && createdAddresses.length > 0) {
            const newAddress = createdAddresses[createdAddresses.length - 1];
            if (newAddress && newAddress.id) {
              addressId = newAddress.id;
            }
          }
          
          if (!addressId) {
            throw new Error("Failed to create address. Please try again.");
          }
        } catch {
          throw new Error("Failed to create address. Please try again.");
        }
      }
      const orderData = {
        shippingAddressId: addressId,
        paymentMethod: paymentMethod.toUpperCase(),
        items: cartItems.map((item) => {
          const orderItem: {
            productId: string;
            quantity: number;
            variantId?: string;
          } = {
            productId: item.productId,
            quantity: item.quantity,
          };
          if (item.variantId) {
            orderItem.variantId = item.variantId;
          }
          return orderItem;
        }),
        couponCode: appliedCoupon?.code,
        ...(paymentMethod.toUpperCase() === 'COD' ? {
          status: 'CONFIRMED' as const,
          paymentStatus: 'PENDING' as const
        } : {
          status: 'PENDING' as const,
          paymentStatus: 'PENDING' as const
        }),
      };
      try {
        const response = await orderService.createOrder(orderData);

        if (response.status === "success") {
          return response.data.order;
        }
        throw new Error(response.message || "Failed to create order");
      } catch (orderError) {
        if (orderError instanceof Error) {
          if (orderError.message?.includes('Insufficient stock') || 
              orderError.message?.includes('out of stock') ||
              orderError.message?.includes('Stock reservation failed')) {
            throw new Error('Some items in your cart are no longer available. Please review your cart and try again.');
          }
        }
        throw orderError;
      }
    },
    onSuccess: () => {
      dispatch(fetchCartThunk());
    },
    onError: (error: Error | AxiosError) => {
      toast.error(getErrorMessage(error as AxiosError));
      orderMutation.reset();
    },
  });

  const createOrder = async (
    paymentMethod: string,
    formData?: ICheckoutFormData
  ) => {
    orderMutation.reset();
    resetPaymentStatus();

    try {
      const normalizedMethod = paymentMethod.toLowerCase();

      if (normalizedMethod === "razorpay") {
        if (!selectedAddressId && !formData?.firstName) {
          throw new Error(
            "Please select a shipping address or fill in address details"
          );
        }
        if (cartItems.length === 0) {
          throw new Error("Your cart is empty");
        }

        const userEmail = formData?.email || "";
        let userPhone = formData?.phone || "";

        if (!userPhone && selectedAddressId) {
          const selectedAddr = addresses.find(
            (addr) => addr.id === selectedAddressId
          );
          if (selectedAddr) {
            userPhone = selectedAddr.phone || "";
          }
        }

        let currentCartItems = cartItems;
        try {
          const response = await cartService.getCart();
          if (response.data && response.data.items) {
            currentCartItems = response.data.items;
          }
        } catch {
          // Silently fall back to current cart data
          currentCartItems = cartItems;
        }

        await queryClient.invalidateQueries({ queryKey: ["cart"] });

        // SECURITY NOTE: Price fetching on the frontend is a security risk
        // The backend MUST validate prices during payment creation to prevent manipulation
        // This frontend price fetch is for display purposes only
        // TODO: Backend should be the single source of truth for prices during checkout
        const cartItemsWithCurrentPrices = await Promise.all(
          currentCartItems.map(async (item, index) => {
            let currentPrice = item.price; // fallback to cart price

            try {
              const product = await productsService.getProductById(
                item.productId
              );

              if (item.variantId && product.variants) {
                const variant = product.variants.find((v) => v.id === item.variantId);

                if (variant && typeof variant.price === "number") {
                  currentPrice = variant.price;
                } else if (typeof product.price === "number") {
                  currentPrice = product.price;
                } else if (typeof product.discountedPrice === "number") {
                  currentPrice = product.discountedPrice;
                }
              } else {
                if (typeof product.discountedPrice === "number") {
                  currentPrice = product.discountedPrice;
                } else if (typeof product.price === "number") {
                  currentPrice = product.price;
                }
              }
            } catch (priceError) {
              // Silently fall back to cart price
              // In development, log the error for debugging
              if (process.env["NODE_ENV"] === 'development') {
                console.error(`Failed to fetch price for item ${index}:`, priceError);
              }
            }

            if (typeof currentPrice !== "number" || currentPrice <= 0) {
              throw new Error(
                `Invalid price for item: ${
                  item.product?.name || "Unknown product"
                }`
              );
            }

            return {
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              price: currentPrice,
            };
          })
        );

        const freshSubtotal = cartItemsWithCurrentPrices.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        const freshTotal = freshSubtotal + shipping + tax - discount;

        const cartData = {
          items: cartItemsWithCurrentPrices,
          subtotal: freshSubtotal,
          tax,
          discount,
          total: freshTotal,
          couponCode: appliedCoupon?.code,
          shippingAddressId: selectedAddressId,
        };

        const paymentResult = await processRazorpayPaymentFromCart(
          cartData,
          userEmail,
          userPhone
        );

        if (!paymentResult.success) {
          if (paymentResult.paymentCaptured) {
            // Payment was taken by Razorpay but client-side order creation failed.
            // The webhook will create the order in the background.
            // Return a sentinel so the page can redirect to the orders list.
            dispatch(fetchCartThunk());
            return { id: null, pendingWebhook: true } as unknown as IOrder;
          }
          throw new Error("Payment failed or cancelled");
        }

        try {
          await dispatch(clearCartThunk()).unwrap();
        } catch {
          // ignore
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["orders"] }),
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
        ]);
        dispatch(fetchCartThunk());
        toast.success("Order placed successfully!");

        return {
          id: paymentResult.orderId,
          status: "CONFIRMED",
          paymentStatus: "COMPLETED",
        };
      }

      if (normalizedMethod === "cod") {
        // COD: order is created with CONFIRMED status and PENDING payment status
        const order = await orderMutation.mutateAsync({
          paymentMethod,
          formData,
        });

        try {
          await dispatch(clearCartThunk()).unwrap();
        } catch {
          // ignore
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["orders"] }),
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
        ]);
        dispatch(fetchCartThunk());
        toast.success("Order placed successfully!");

        // Return the order as-is since status is set correctly by backend
        return order;
      }

      throw new Error(
        "Selected payment method is not available yet. Please choose Razorpay or COD."
      );
    } catch (error) {
      throw error;
    }
  };

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );
  const shipping = 0;
  const tax = 0;
  const discount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    if (appliedCoupon.type === "PERCENTAGE") {
      const d = (subtotal * appliedCoupon.value) / 100;
      return appliedCoupon.maxDiscount
        ? Math.min(d, appliedCoupon.maxDiscount)
        : d;
    } else {
      return appliedCoupon.value;
    }
  }, [appliedCoupon, cartItems]);
  const total = subtotal + shipping + tax - discount;

  const loading =
    cartLoading ||
    addressesLoading ||
    couponMutation.isPending ||
    orderMutation.isPending;
  const error =
    cartError?.message ||
    addressesError?.message ||
    couponMutation.error?.message ||
    orderMutation.error?.message ||
    "";

  return {
    cartItems,
    addresses,
    selectedAddressId,
    couponCode,
    appliedCoupon,
    loading,
    error,
    couponMutation,
    paymentStatus,

    setSelectedAddressId,
    setCouponCode,
    applyCoupon,
    removeCoupon,
    createOrder,
    loadCart: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
    loadAddresses: () =>
      queryClient.invalidateQueries({ queryKey: ["addresses"] }),
    resetPaymentStatus,

    subtotal,
    shipping,
    tax,
    discount,
    total,
  };
};
