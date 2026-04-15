"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  MapPinned,
  Package,
  ReceiptText,
} from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type AdminSection = "overview" | "orders" | "products" | "sources" | "geography";

type AdminLayoutProps = {
  children: React.ReactNode;
  section: AdminSection;
  title: string;
  description?: string;
  totalOrders?: number;
  actions?: React.ReactNode;
};

const sectionTitle: Record<AdminSection, string> = {
  overview: "Обзор",
  orders: "Заказы",
  products: "Товары",
  sources: "Источники",
  geography: "География",
};

export function AdminLayout({
  children,
  section,
  title,
  description,
  totalOrders = 0,
  actions,
}: AdminLayoutProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "18rem",
          "--header-height": "3.5rem",
        } as React.CSSProperties
      }
    >
      <Sidebar variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">
                <LayoutDashboard />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">GBC Аналитика</span>
                  <span className="truncate text-xs text-muted-foreground">RetailCRM x Supabase</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Разделы</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={section === "overview"} render={<Link href="/" />}>
                    <LayoutDashboard />
                    <span>Обзор</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={section === "orders"} render={<Link href="/orders" />}>
                    <ReceiptText />
                    <span>Заказы</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{totalOrders}</SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={section === "products"} render={<Link href="/products" />}>
                    <Package />
                    <span>Товары</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={section === "geography"} render={<Link href="/geography" />}>
                    <MapPinned />
                    <span>География</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Аналитика продаж</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{sectionTitle[section]}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>

        <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <div className="rounded-3xl border bg-gradient-to-r from-primary/5 via-background to-background px-6 py-6 shadow-xs">
              <div className="grid gap-2">
                <div className="grid gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                  {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
                </div>
              </div>
            </div>
          </div>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AdminActionLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Button variant="outline" size="sm" nativeButton={false} render={<Link href={href} />}>
      {children}
    </Button>
  );
}
