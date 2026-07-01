import type { Metadata } from "next";
import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { listOrders } from "@/lib/services/automation-service";
import { parseJson } from "@/lib/json";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { StatusActions, type TransitionOption } from "@/components/automation/status-actions";
import { OrderCreateForm } from "@/components/automation/create-forms";
import { ORDER_STATUS_META, ORDER_TYPE_META } from "@/lib/labels";
import type { OrderItem, OrderStatus, OrderType } from "@/lib/types";
import { formatMoney, formatPhone, relativeTime } from "@/lib/utils";
import { Bot, ShoppingBag } from "lucide-react";

export const metadata: Metadata = { title: "Orders" };

function transitionsFor(status: OrderStatus): TransitionOption[] {
  switch (status) {
    case "new":
      return [
        { to: "preparing", label: "Start preparing" },
        { to: "cancelled", label: "Cancel", danger: true },
      ];
    case "preparing":
      return [
        { to: "ready", label: "Mark ready" },
        { to: "cancelled", label: "Cancel", danger: true },
      ];
    case "ready":
      return [
        { to: "fulfilled", label: "Fulfill" },
        { to: "cancelled", label: "Cancel", danger: true },
      ];
    default:
      return [];
  }
}

function OrderRow({
  order,
  withActions,
}: {
  order: Awaited<ReturnType<typeof listOrders>>[number];
  withActions: boolean;
}) {
  const meta = ORDER_STATUS_META[order.status as OrderStatus];
  const items = parseJson<OrderItem[]>(order.items, []);
  return (
    <li className="flex flex-wrap items-center gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">
          {items.map((i) => `${i.qty}× ${i.name}`).join(", ") || "Order"}
        </p>
        <p className="flex items-center gap-1.5 truncate text-xs text-faint">
          {order.contactName} · {formatPhone(order.contactPhone)} ·{" "}
          {relativeTime(order.createdAt)}
          {order.callId ? (
            <Link
              href={`/calls/${order.callId}`}
              className="inline-flex items-center gap-1 text-brand hover:underline"
            >
              <Bot className="size-3" /> AI-taken
            </Link>
          ) : null}
        </p>
      </div>
      <Badge variant="outline">{ORDER_TYPE_META[order.type as OrderType]}</Badge>
      <span className="font-display w-20 text-right text-sm font-bold text-fg">
        {formatMoney(order.totalCents)}
      </span>
      <Badge variant={meta.variant}>{meta.label}</Badge>
      {withActions ? (
        <StatusActions
          endpoint={`/api/v1/orders/${order.id}`}
          transitions={transitionsFor(order.status as OrderStatus)}
        />
      ) : null}
    </li>
  );
}

export default async function OrdersPage() {
  const user = await requireCurrentUser();
  const orders = await listOrders(user.id);
  const active = orders.filter((o) => ["new", "preparing", "ready"].includes(o.status));
  const closed = orders
    .filter((o) => ["fulfilled", "cancelled"].includes(o.status))
    .slice(0, 25);
  const activeValue = active.reduce((s, o) => s + o.totalCents, 0);

  return (
    <>
      <PageHeader
        title="Orders"
        description={`${active.length} in progress · ${formatMoney(activeValue)} open value.`}
      />
      <OrderCreateForm />

      <div className="space-y-6">
        <Card>
          <CardHeader title="In progress" subtitle="New → preparing → ready → fulfilled" />
          <CardBody>
            {active.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="size-8" />}
                title="No open orders"
                description="Orders your assistant takes over the phone land here in real time."
              />
            ) : (
              <ul className="divide-y divide-line">
                {active.map((o) => (
                  <OrderRow key={o.id} order={o} withActions />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent history" subtitle="Fulfilled and cancelled orders" />
          <CardBody>
            {closed.length === 0 ? (
              <p className="text-sm text-faint">No order history yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {closed.map((o) => (
                  <OrderRow key={o.id} order={o} withActions={false} />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
