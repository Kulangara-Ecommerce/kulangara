"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Sheet, SheetContent } from "../ui/sheet";
import { useState } from "react";
import { 
  FiHome, 
  FiShoppingBag, 
  FiPackage, 
  FiTag, 
  FiPercent, 
  FiUsers, 
  FiBarChart2, 
  FiMail, 
  FiLogOut,
  FiMenu,
  FiXCircle
} from "react-icons/fi";

const navigationItems = [
  { name: "Dashboard", href: "/admin", icon: FiHome },
  { name: "Orders", href: "/admin/orders", icon: FiShoppingBag },
  { name: "Cancelled & Failed", href: "/admin/cancelled-orders", icon: FiXCircle },
  { name: "Products", href: "/admin/products", icon: FiPackage },
  { name: "Categories", href: "/admin/categories", icon: FiTag },
  { name: "Coupons", href: "/admin/coupons", icon: FiPercent },
  { name: "Users", href: "/admin/users", icon: FiUsers },
  { name: "Analytics", href: "/admin/analytics", icon: FiBarChart2 },
  { name: "Email", href: "/admin/email", icon: FiMail },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-lg font-bold mb-2">Admin Panel</h1>
        {user && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {user.role?.replace("_", " ")}
            </Badge>
          </div>
        )}
      </div>
      
      <Separator className="" />
      
      <nav className="space-y-1 flex-1 mt-4">
        {(user?.role === "DELIVERY_PARTNER"
          ? navigationItems.filter((i) => i.name === "Orders")
          : navigationItems
        ).map((item) => {
          const isDashboard = item.href === "/admin";
          const isActive = isDashboard
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          
          return (
            <Button
              key={item.name}
              variant={isActive ? "default" : "ghost"}
              className="w-full justify-start gap-3 h-11"
              asChild
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Link href={item.href}>
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            </Button>
          );
        })}
      </nav>
      
      <Separator className="my-4" />
      
      <Button
        variant="ghost"
        onClick={() => {
          logout();
          setIsMobileMenuOpen(false);
        }}
        className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <FiLogOut className="h-4 w-4" />
        Logout
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Header - Only visible on large screens */}
      <div className="hidden lg:block fixed top-0 left-0 right-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between px-8 h-16">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold hover:text-primary transition-colors">
              KULANGARA
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <span className="text-sm text-muted-foreground">Admin Panel</span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-sm">{user.firstName} {user.lastName}</span>
                <Badge variant="secondary" className="text-xs">
                  {user.role?.replace("_", " ")}
                </Badge>
              </div>
            )}
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <FiLogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Header with Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-base font-semibold">Admin Panel</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <FiMenu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-full p-6">
          <div className="h-full flex flex-col">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Layout */}
      <div className="hidden lg:block pt-16">
        <PanelGroup direction="horizontal" className="min-h-screen">
          <Panel 
            defaultSize={20} 
            minSize={15} 
            maxSize={30}
            className="bg-muted/30 border-r border-border"
          >
            <div className="p-6 pt-6 h-full">
              <SidebarContent />
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-accent transition-colors cursor-col-resize" />

          <Panel minSize={60} className="bg-background">
            <div className="p-8 lg:p-12 h-full overflow-auto">
              <div className="max-w-7xl mx-auto">{children}</div>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Mobile Content */}
      <div className="lg:hidden">
        <div className="pt-16 min-h-screen">
          <div className="h-full overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
