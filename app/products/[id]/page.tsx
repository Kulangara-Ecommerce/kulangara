"use client";

import { notFound } from "next/navigation";
import { use, useState } from "react";
import { useProduct } from "@/app/hooks/useProducts";
import { useReviews } from "@/app/hooks/useReviews";
import { useAddToCart } from "@/app/hooks/useCart";
import { Button } from "@/app/components/ui/button";
import ProductReviews from "@/app/components/ui/ProductReviews";
import {
  FaTruck,
  FaCreditCard,
  FaShieldAlt,
  FaHeart,
  FaRegHeart,
  FaChevronLeft,
  FaChevronRight,
  FaStar,
  FaCheck,
  FaMinus,
  FaPlus,
  FaShoppingBag,
} from "react-icons/fa";
import Image from "next/image";
import {
  useWishlist,
  useCreateWishlistItems,
  useDeleteWishlistItems,
} from "@/app/hooks/useWishlist";
import { useSingleProductStock } from "@/app/hooks/useCartValidation";
import { toast } from "react-hot-toast";
import { IWishlistItem } from "@/app/types/wishlist.type";
import SizeGuideModal from "@/app/components/ui/SizeGuideModal";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Separator } from "@/app/components/ui/separator";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";

type Params = { id: string };

export default function ProductPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const { data: product, isLoading, error } = useProduct(id);
  const { data: reviewsData } = useReviews(id);
  const { data: wishlistResponse } = useWishlist();
  const createWishlistMutation = useCreateWishlistItems();
  const deleteWishlistMutation = useDeleteWishlistItems();
  const { addItemToCart, loading: cartLoading } = useAddToCart();
  const { data: stockInfo, isLoading: stockLoading } =
    useSingleProductStock(id);

  // State management
  const [selectedFit, setSelectedFit] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  // Check if product is in wishlist
  const wishlistItems = wishlistResponse?.data || [];
  const isWishlisted = wishlistItems.some(
    (item: IWishlistItem) => item.product.id === id
  );

  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

  const sortSizes = (arr: string[]) =>
    [...arr].sort((a, b) => {
      const ai = sizeOrder.findIndex((s) => s.toUpperCase() === a.toUpperCase());
      const bi = sizeOrder.findIndex((s) => s.toUpperCase() === b.toUpperCase());
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });

  // Distinct fit values on the product's variants (NORMAL / OVERSIZED)
  const availableFits = [
    ...new Set(
      (product?.variants || []).map((v) => v.fit).filter(Boolean) as string[]
    ),
  ];
  const hasFits = availableFits.length > 0;

  // Sizes filtered by the selected fit (or all sizes when no fits exist)
  const sizesForFit = hasFits
    ? sortSizes([
        ...new Set(
          (product?.variants || [])
            .filter((v) => v.fit === (selectedFit || availableFits[0]))
            .map((v) => v.size)
        ),
      ])
    : sortSizes([
        ...new Set(
          product?.sizes || (product?.variants || []).map((v) => v.size)
        ),
      ]);

  const sizes = sizesForFit;

  // Fallback data for missing properties
  const companyFeatures = product?.companyFeatures || [
    {
      icon: "truck",
      title: "Free Shipping",
      description: "Free shipping on all orders",
    },
    {
      icon: "credit-card",
      title: "Secure Payment",
      description: "100% secure payment processing",
    },
    {
      icon: "shield",
      title: "Easy Returns",
      description: "7-day return policy",
    },
  ];

  const deliveryInfo = product?.deliveryInfo || {
    estimatedDays: "8-10",
    shippingFee: 0,
    returnPeriod: 7,
  };
  const handleFitSelect = (fit: string) => {
    setSelectedFit(fit);
    setSelectedSize(""); // reset size when fit changes
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
  };

  const handleImageChange = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleWishlistToggle = async () => {
    try {
      if (isWishlisted) {
        await deleteWishlistMutation.mutateAsync(id);
        toast.success("Removed from wishlist");
      } else {
        await createWishlistMutation.mutateAsync(id);
        toast.success("Added to wishlist");
      }
    } catch {
      toast.error("Failed to update wishlist");
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const getStockDisplay = () => {
    if (stockLoading)
      return <Badge variant="secondary">Checking stock...</Badge>;
    if (!stockInfo)
      return <Badge variant="secondary">Stock info unavailable</Badge>;

    const { stockQuantity, lowStockThreshold } = stockInfo;

    if (stockQuantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (stockQuantity <= lowStockThreshold) {
      return (
        <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">
          Only {stockQuantity} left!
        </Badge>
      );
    } else if (stockQuantity <= 10) {
      return (
        <Badge variant="outline" className="border-yellow-500/50 bg-yellow-50 text-yellow-700">
          Low stock ({stockQuantity} available)
        </Badge>
      );
    }

    return <Badge variant="outline" className="border-green-500/50 bg-green-50 text-green-700">In Stock</Badge>;
  };

  const handleAddToCart = async () => {
    if (hasFits && !selectedFit) {
      toast.error("Please select a fit (Normal or Oversized)");
      return;
    }
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }

    if (!product) {
      toast.error("Product not found");
      return;
    }

    if (stockInfo && stockInfo.stockQuantity === 0) {
      toast.error("This item is out of stock");
      return;
    }

    if (stockInfo && quantity > stockInfo.stockQuantity) {
      toast.error(`Only ${stockInfo.stockQuantity} items available`);
      return;
    }

    try {
      const activeFit = selectedFit || undefined;
      const selectedVariant = product.variants?.find(
        (v) => v.size === selectedSize && (!activeFit || v.fit === activeFit)
      );

      await addItemToCart({
        productId: product.id,
        quantity: quantity,
        variantId: selectedVariant?.id,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message?.includes("Insufficient stock")
      ) {
        toast.error(
          "This item is no longer available in the requested quantity."
        );
      } else {
        console.error("Failed to add to cart:", error);
      }
    }
  };

  /*
  const handleBuyNow = async () => {
    if (hasFits && !selectedFit) {
      toast.error("Please select a fit (Normal or Oversized)");
      return;
    }
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }

    if (!product) {
      toast.error("Product not found");
      return;
    }

    if (stockInfo && stockInfo.stockQuantity === 0) {
      toast.error("This item is out of stock");
      return;
    }

    if (stockInfo && quantity > stockInfo.stockQuantity) {
      toast.error(`Only ${stockInfo.stockQuantity} items available`);
      return;
    }

    try {
      const activeFit = selectedFit || undefined;
      const selectedVariant = product.variants?.find(
        (v) => v.size === selectedSize && (!activeFit || v.fit === activeFit)
      );

      // Clear cart first so buy-now checks out only this item
      // (prevents quantity accumulation from previous failed buy-now attempts)
      await dispatch(clearCart()).unwrap();

      // Add item to cart and wait for it to complete
      await addItemToCart({
        productId: product.id,
        quantity: quantity,
        variantId: selectedVariant?.id,
      });

      // Fetch the latest cart state to ensure it's synced
      await dispatch(fetchCart()).unwrap();

      // Navigate to checkout using Next.js router
      router.push("/checkout");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message?.includes("Insufficient stock")
      ) {
        toast.error(
          "This item is no longer available in the requested quantity."
        );
      } else {
        console.error("Failed to buy now:", error);
        toast.error("Failed to proceed to checkout. Please try again.");
      }
    }
  };
  */

  const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = {
      sm: "w-3 h-3",
      md: "w-4 h-4",
      lg: "w-5 h-5",
    };

    return [...Array(5)].map((_, i) => (
      <FaStar
        key={i}
        className={`${sizeClasses[size]} ${
          i < rating ? "text-yellow-500" : "text-muted"
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 lg:py-12 mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Image Gallery Skeleton - 3 columns */}
            <div className="lg:col-span-3 space-y-4">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <div className="flex gap-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-20 rounded-xl" />
                ))}
              </div>
            </div>
            
            {/* Product Info Skeleton - 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </div>
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Separator />
              <div className="space-y-3">
                <Skeleton className="h-6 w-24" />
                <div className="flex gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-14 rounded-lg" />
                  ))}
                </div>
              </div>
              <Separator />
              <div className="flex gap-3">
                <Skeleton className="h-12 flex-1 rounded-lg" />
                <Skeleton className="h-12 flex-1 rounded-lg" />
              </div>
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return notFound();
  }

  const images = product.images || [
    { url: "/images/coming-soon.jpg", alt: product.name },
  ];

  // Compute display price based on selected fit (variant price overrides product price)
  const displayPrice = (() => {
    if (hasFits && selectedFit) {
      const variant = product.variants?.find((v) => v.fit === selectedFit);
      return (variant?.price ?? product.price) as number;
    }
    return product.price;
  })();

  const displayDiscountedPrice = (() => {
    if (hasFits && selectedFit) {
      const variant = product.variants?.find((v) => v.fit === selectedFit);
      if (variant?.price != null) return undefined;
      return product.discountedPrice;
    }
    return product.discountedPrice;
  })();

  const discountPercentage = displayDiscountedPrice && displayDiscountedPrice < displayPrice
    ? Math.round(
        ((displayPrice - displayDiscountedPrice) / displayPrice) * 100
      )
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 lg:py-12 mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Product Image Gallery - 3 columns on large screens */}
          <div className="lg:col-span-3 space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted/20 group border border-border/40">
              <Image
                src={images[selectedImageIndex]?.url || "/images/coming-soon.jpg"}
                alt={images[selectedImageIndex]?.alt || product.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                priority
              />

              {/* Wishlist Button */}
              <Button
                size="icon"
                variant="ghost"
                onClick={handleWishlistToggle}
                className={`absolute top-5 right-5 h-11 w-11 rounded-full backdrop-blur-md border transition-all duration-200 shadow-lg ${
                  isWishlisted
                    ? "bg-primary/90 border-primary/50 text-primary-foreground hover:bg-primary hover:scale-110"
                    : "bg-background/80 border-border/60 text-muted-foreground hover:bg-background hover:text-foreground hover:scale-110"
                }`}
                aria-label="Add to wishlist"
                disabled={
                  createWishlistMutation.isPending ||
                  deleteWishlistMutation.isPending
                }
              >
                {isWishlisted ? (
                  <FaHeart className="w-5 h-5" />
                ) : (
                  <FaRegHeart className="w-5 h-5" />
                )}
              </Button>

              {/* Discount Badge */}
              {discountPercentage > 0 && (
                <Badge className="absolute top-5 left-5 bg-destructive text-destructive-foreground text-sm font-bold px-3 py-1.5 shadow-lg">
                  -{discountPercentage}% OFF
                </Badge>
              )}

              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      handleImageChange(Math.max(0, selectedImageIndex - 1))
                    }
                    disabled={selectedImageIndex === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/90 backdrop-blur-md border border-border/60 hover:bg-background shadow-lg disabled:opacity-40 transition-all hover:scale-110"
                  >
                    <FaChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      handleImageChange(
                        Math.min(images.length - 1, selectedImageIndex + 1)
                      )
                    }
                    disabled={selectedImageIndex === images.length - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/90 backdrop-blur-md border border-border/60 hover:bg-background shadow-lg disabled:opacity-40 transition-all hover:scale-110"
                  >
                    <FaChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Thumbnail Images */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => handleImageChange(index)}
                    className={`relative flex-shrink-0 w-24 h-24 overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                      index === selectedImageIndex
                        ? "border-primary ring-2 ring-primary/20 scale-105"
                        : "border-border/40 hover:border-primary/50 hover:scale-105"
                    }`}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt || product.name}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

        {/* Product Info - 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Section */}
          <div className="space-y-4">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
              {product.name}
            </h1>

            {/* Price Section */}
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                {displayDiscountedPrice && displayDiscountedPrice < displayPrice ? (
                  <>
                    <div className="flex items-baseline gap-3">
                      <p className="text-4xl font-bold text-foreground">
                        ₹{displayDiscountedPrice.toLocaleString()}
                      </p>
                      <p className="text-xl text-muted-foreground line-through">
                        ₹{displayPrice.toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">Inclusive of all taxes</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-bold text-foreground">
                      ₹{displayPrice.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Inclusive of all taxes</p>
                  </>
                )}
              </div>
              {displayDiscountedPrice && displayDiscountedPrice < displayPrice && (
                <Badge className="bg-green-500 hover:bg-green-600 text-white font-semibold text-sm px-3 py-1.5">
                  Save ₹{(displayPrice - displayDiscountedPrice).toLocaleString()}
                </Badge>
              )}
            </div>

            {/* Rating and Stock Row */}
            <div className="flex items-center gap-4 flex-wrap">
              {reviewsData?.meta?.stats?.averageRating && reviewsData.meta.stats.averageRating > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {renderStars(reviewsData.meta.stats.averageRating, "sm")}
                  </div>
                  <span className="text-sm font-semibold">
                    {reviewsData.meta.stats.averageRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({reviewsData.meta.total} {reviewsData.meta.total === 1 ? "review" : "reviews"})
                  </span>
                </div>
              ) : null}
              {getStockDisplay()}
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Product Description</h3>
            <p className="text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          </div>

          <Separator />

          {/* Fit Selection — only shown when the product has fit variants */}
          {hasFits && (
            <>
              <div className="space-y-3">
                <label className="text-base font-semibold">Select Fit</label>
                <div className="flex flex-wrap gap-3">
                  {availableFits.map((fit) => (
                    <Button
                      key={fit}
                      variant={selectedFit === fit ? "default" : "outline"}
                      onClick={() => handleFitSelect(fit)}
                      className={`h-12 px-6 font-semibold transition-all ${
                        selectedFit === fit
                          ? "ring-2 ring-primary/20 shadow-md"
                          : "hover:border-primary/50"
                      }`}
                    >
                      {fit === "OVERSIZED" ? "Oversized" : "Normal"}
                    </Button>
                  ))}
                </div>
                {selectedFit && (
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <FaCheck className="text-green-600" />
                    {selectedFit === "OVERSIZED" ? "Oversized" : "Normal"} fit selected
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Size Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-base font-semibold">
                Select Size
              </label>
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsSizeGuideOpen(true)}
                className="h-auto p-0 text-sm text-primary hover:text-primary/80"
              >
                Size Guide
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              {sizes.map((size) => (
                <Button
                  key={size}
                  variant={selectedSize === size ? "default" : "outline"}
                  onClick={() => handleSizeSelect(size)}
                  disabled={hasFits && !selectedFit}
                  className={`min-w-[3.5rem] h-12 font-semibold transition-all ${
                    selectedSize === size
                      ? "ring-2 ring-primary/20 shadow-md"
                      : "hover:border-primary/50"
                  }`}
                >
                  {size}
                </Button>
              ))}
            </div>
            {hasFits && !selectedFit && (
              <p className="text-sm text-muted-foreground">
                Select a fit above to see available sizes
              </p>
            )}
            {selectedSize && (
              <div className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <FaCheck className="text-green-600" />
                Size {selectedSize} selected
              </div>
            )}
          </div>

          <Separator />

          {/* Quantity Selection */}
          <div className="space-y-4">
            <label className="text-base font-semibold">
              Quantity
            </label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
                className="h-11 w-11 rounded-lg hover:bg-muted transition-colors"
              >
                <FaMinus className="w-3.5 h-3.5" />
              </Button>
              <span className="w-20 text-center text-xl font-bold">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= 10}
                className="h-11 w-11 rounded-lg hover:bg-muted transition-colors"
              >
                <FaPlus className="w-3.5 h-3.5" />
              </Button>
              {stockInfo && stockInfo.stockQuantity > 0 && (
                <span className="text-sm text-muted-foreground ml-2">
                  Max {Math.min(10, stockInfo.stockQuantity)} per order
                </span>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleAddToCart}
                size="lg"
                className="flex-1 h-14 p-2 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                disabled={
                  (hasFits && !selectedFit) || !selectedSize || cartLoading || stockInfo?.stockQuantity === 0
                }
              >
                <FaShoppingBag className="mr-2 h-5 w-5" />
                {cartLoading
                  ? "Adding..."
                  : stockInfo?.stockQuantity === 0
                  ? "Out of Stock"
                  : "Add to Cart"}
              </Button>
              {/* Buy Now kept commented for future use
              <Button
                variant="outline"
                size="lg"
                onClick={handleBuyNow}
                className="flex-1 h-14 p-2 text-base font-semibold border-2 hover:bg-primary hover:border-primary transition-all"
                disabled={
                  (hasFits && !selectedFit) || !selectedSize || cartLoading || stockInfo?.stockQuantity === 0
                }
              >
                <FaBolt className="mr-2 h-5 w-5" />
                {cartLoading
                  ? "Processing..."
                  : stockInfo?.stockQuantity === 0
                  ? "Out of Stock"
                  : "Buy Now"}
              </Button>
              */}
            </div>
            {(hasFits && !selectedFit) || !selectedSize ? (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-center">
                <p className="text-sm font-medium text-destructive">
                  {hasFits && !selectedFit
                    ? "Please select a fit to continue"
                    : "Please select a size to continue"}
                </p>
              </div>
            ) : null}
          </div>

          <Separator />

          {/* Company Features */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Why Shop With Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {companyFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-4 group">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    {feature.icon === "truck" && (
                      <FaTruck className="w-5 h-5" />
                    )}
                    {feature.icon === "credit-card" && (
                      <FaCreditCard className="w-5 h-5" />
                    )}
                    {feature.icon === "shield" && (
                      <FaShieldAlt className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h4 className="font-semibold text-sm mb-1">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Additional Information Accordion */}
          <Accordion type="single" collapsible className="w-full border border-border/60 rounded-xl overflow-hidden">
            <AccordionItem value="delivery" className="border-b">
              <AccordionTrigger className="text-base font-semibold px-6 hover:no-underline hover:bg-muted/50">
                Delivery & Returns
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid grid-cols-1 gap-4 pt-4">
                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                    <FaTruck className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Estimated Delivery</h4>
                      <p className="text-sm text-muted-foreground">
                        {deliveryInfo.estimatedDays} business days
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                    <FaCreditCard className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Shipping Cost</h4>
                      <p className="text-sm text-muted-foreground">
                        {deliveryInfo.shippingFee === 0
                          ? "Free shipping on this order"
                          : `₹${deliveryInfo.shippingFee} shipping fee`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                    <FaShieldAlt className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Return Policy</h4>
                      <p className="text-sm text-muted-foreground">
                        {deliveryInfo.returnPeriod} days hassle-free returns
                      </p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="details" className="border-b">
              <AccordionTrigger className="text-base font-semibold px-6 hover:no-underline hover:bg-muted/50">
                Product Details
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {product.material && (
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2">
                          Material
                        </h4>
                        <p className="text-sm text-muted-foreground">{product.material}</p>
                      </div>
                    )}
                    {product.dimensions && (
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2">
                          Dimensions
                        </h4>
                        <p className="text-sm text-muted-foreground">{product.dimensions}</p>
                      </div>
                    )}
                  </div>
                  {product.care && product.care.length > 0 && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold text-sm mb-3">
                        Care Instructions
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        {product.care.map((instruction, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <FaCheck className="w-3 h-3 text-primary mt-1 flex-shrink-0" />
                            {instruction}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="features" className="border-none">
              <AccordionTrigger className="text-base font-semibold px-6 hover:no-underline hover:bg-muted/50">
                Features & Highlights
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="pt-4">
                  {product.features && product.features.length > 0 ? (
                    <ul className="space-y-3">
                      {product.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm">
                          <FaCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No features listed</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

        </div>
      </div>

      {/* Reviews Section - Full Width */}
      <div className="mt-16">
        <Separator className="mb-12" />
        
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              Customer Reviews
            </h2>
            <p className="text-muted-foreground">
              See what our customers are saying about this product
            </p>
          </div>
          
          <ProductReviews
            productId={product.id}
            showSummary={true}
            showAddButton={true}
          />
        </div>
      </div>

      {/* Size Guide Modal */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
      />
    </div>
    </div>
  );
}
