"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, ClipboardCheck, Copy, Minus, PackageCheck, Plus, Printer, RefreshCw, Search, ShoppingBasket, Sprout, Truck, WalletCards, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { CATALOG, type CatalogProduct } from "@/lib/catalog";

type Cart = Record<string, number>;
type OrderStatus = "received" | "preparing" | "ready" | "delivered";
type OrderItem = { productId: string; productName: string; unit: string; quantity: number; unitPriceCents: number; subtotalCents: number };
type Order = { protocol: string; customerName: string; phone: string; deliveryMethod: "delivery" | "pickup"; address: string; paymentMethod: string; notes: string; status: OrderStatus; discountCents: number; totalCents: number; printedAt: string | null; createdAt: string; items: OrderItem[] };
type CheckoutData = { customerName: string; phone: string; deliveryMethod: "delivery" | "pickup"; address: string; paymentMethod: string; notes: string };

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const STATUS: Record<OrderStatus, { label: string; className: string }> = {
  received: { label: "Recebido", className: "status-received" },
  preparing: { label: "Separando", className: "status-preparing" },
  ready: { label: "Pronto", className: "status-ready" },
  delivered: { label: "Entregue", className: "status-delivered" },
};
const initialCheckout: CheckoutData = { customerName: "", phone: "", deliveryMethod: "delivery", address: "", paymentMethod: "Pix", notes: "" };

function cents(value: number) { return money.format(value / 100); }
function shortDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }

function ProductCard({ product, quantity, onAdd, onRemove }: { product: CatalogProduct; quantity: number; onAdd: () => void; onRemove: () => void }) {
  return <article className="product-card">
    <div className={`product-art ${product.tone}`} aria-hidden="true"><span>{product.shortName}</span><Sprout /></div>
    <div className="product-body">
      <p className="eyebrow">{product.category}</p><h3>{product.name}</h3><p className="product-description">{product.description}</p>
      <div className="product-footer"><div><strong>{cents(product.priceCents)}</strong><span>/{product.unit}</span></div>
        {quantity === 0 ? <Button onClick={onAdd} size="sm" aria-label={`Adicionar ${product.name}`}><Plus /> Adicionar</Button> :
          <div className="stepper" aria-label={`Quantidade de ${product.name}`}><Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Diminuir"><Minus /></Button><strong>{quantity}</strong><Button variant="ghost" size="icon-sm" onClick={onAdd} aria-label="Aumentar"><Plus /></Button></div>}
      </div>
    </div>
  </article>;
}

function Receipt({ order }: { order: Order | null }) {
  if (!order) return null;
  return <section id="print-receipt" className="print-receipt" aria-hidden="true">
    <div className="receipt-brand"><Sprout /><strong>AquaFolhas</strong></div><h1>PEDIDO {order.protocol}</h1><p>{shortDate(order.createdAt)}</p><hr />
    <p><strong>Cliente:</strong> {order.customerName}</p><p><strong>WhatsApp:</strong> {order.phone}</p><p><strong>Entrega:</strong> {order.deliveryMethod === "delivery" ? "Sábado" : "Retirada domingo"}</p>{order.address && <p><strong>Endereço:</strong> {order.address}</p>}<hr />
    {order.items.map((item) => <div className="receipt-row" key={item.productId}><span>{item.quantity}x {item.productName}</span><strong>{cents(item.subtotalCents)}</strong></div>)}
    {order.discountCents > 0 && <div className="receipt-row"><span>Desconto retirada (15%)</span><strong>-{cents(order.discountCents)}</strong></div>}<hr />
    <div className="receipt-total"><span>TOTAL</span><strong>{cents(order.totalCents)}</strong></div><p><strong>Pagamento:</strong> {order.paymentMethod}</p>{order.notes && <p><strong>Observação:</strong> {order.notes}</p>}
    <div className="receipt-checks"><span>□ Separado</span><span>□ Conferido</span><span>□ Entregue</span></div>
  </section>;
}

export default function Home({ customerOnly = false }: { customerOnly?: boolean } = {}) {
  const [activeTab, setActiveTab] = useState("shop");
  const [cart, setCart] = useState<Cart>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutData>(initialCheckout);
  const [saving, setSaving] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [printOrder, setPrintOrder] = useState<Order | null>(null);

  const categories = useMemo(() => ["Todos", ...Array.from(new Set(CATALOG.map((p) => p.category)))], []);
  const filteredProducts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return CATALOG.filter((product) => (category === "Todos" || product.category === category) && (!term || product.name.toLocaleLowerCase("pt-BR").includes(term)));
  }, [category, query]);
  const cartLines = useMemo(() => CATALOG.filter((product) => cart[product.id]).map((product) => ({ ...product, quantity: cart[product.id] })), [cart]);
  const itemCount = cartLines.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalCents = cartLines.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const discountCents = checkout.deliveryMethod === "pickup" ? Math.round(subtotalCents * .15) : 0;
  const totalCents = subtotalCents - discountCents;

  const loadOrders = useCallback(async (quiet = false) => {
    if (!quiet) setLoadingOrders(true);
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      const data = await response.json() as { orders?: Order[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar os pedidos.");
      setOrders(data.orders || []); setOrderError("");
    } catch (error) { setOrderError(error instanceof Error ? error.message : "Não foi possível carregar os pedidos."); }
    finally { if (!quiet) setLoadingOrders(false); }
  }, []);

  useEffect(() => { if (activeTab !== "admin") return; void loadOrders(); const timer = window.setInterval(() => void loadOrders(true), 8000); return () => window.clearInterval(timer); }, [activeTab, loadOrders]);

  const changeQuantity = useCallback((productId: string, delta: number) => setCart((current) => {
    const next = Math.max(0, (current[productId] || 0) + delta);
    if (!next) { const { [productId]: _removed, ...rest } = current; return rest; }
    return { ...current, [productId]: next };
  }), []);

  const createOrder = useCallback(async (payload: CheckoutData, requestedCart: Cart) => {
    const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, items: Object.entries(requestedCart).map(([productId, quantity]) => ({ productId, quantity })) }) });
    const data = await response.json() as { order?: Order; error?: string };
    if (!response.ok || !data.order) throw new Error(data.error || "Não foi possível enviar o pedido.");
    return data.order;
  }, []);

  async function handleCheckout(event: FormEvent) {
    event.preventDefault(); if (!itemCount) return;
    if (checkout.deliveryMethod === "delivery" && subtotalCents < 3000) { toast.error("O pedido mínimo para entrega é R$ 30,00."); return; }
    if (checkout.deliveryMethod === "delivery" && !checkout.address.trim()) { toast.error("Informe o endereço para entrega."); return; }
    setSaving(true);
    try { const order = await createOrder(checkout, cart); setSuccessOrder(order); setCart({}); setCheckout(initialCheckout); setCheckoutOpen(false); toast.success(`Pedido ${order.protocol} enviado.`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível enviar o pedido."); }
    finally { setSaving(false); }
  }

  async function updateOrder(protocol: string, data: { status?: OrderStatus; printed?: boolean }) {
    const response = await fetch("/api/orders", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ protocol, ...data }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || "Não foi possível atualizar o pedido.");
    await loadOrders(true);
  }

  function handlePrint(order: Order) { setPrintOrder(order); window.setTimeout(() => { window.print(); void updateOrder(order.protocol, { printed: true }).catch(() => undefined); }, 120); }
  function whatsappText(order: Order) { return encodeURIComponent(`Olá, AquaFolhas! Meu pedido foi recebido.\n\nProtocolo: ${order.protocol}\n${order.items.map((item) => `${item.quantity}x ${item.productName}`).join("\n")}\nTotal: ${cents(order.totalCents)}\n\nMeu protocolo é ${order.protocol}.`); }

  const today = new Date().toDateString();
  const todayOrders = orders.filter((order) => new Date(order.createdAt).toDateString() === today);
  const openOrders = orders.filter((order) => order.status !== "delivered");
  const pendingPrint = orders.filter((order) => !order.printedAt);

  useEffect(() => {
    const context = typeof document === "undefined" ? undefined : (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({ name: "create_aquafolhas_order", title: "Criar pedido AquaFolhas", description: "Cria um pedido com produtos do catálogo e devolve o protocolo confirmado.", inputSchema: { type: "object", properties: { customerName: { type: "string" }, phone: { type: "string" }, deliveryMethod: { type: "string", enum: ["delivery", "pickup"] }, address: { type: "string" }, paymentMethod: { type: "string" }, notes: { type: "string" }, items: { type: "array", items: { type: "object", properties: { productId: { type: "string" }, quantity: { type: "integer", minimum: 1 } }, required: ["productId", "quantity"], additionalProperties: false }, minItems: 1 } }, required: ["customerName", "phone", "deliveryMethod", "paymentMethod", "items"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async (input: unknown) => { const request = input as CheckoutData & { items: { productId: string; quantity: number }[] }; const order = await createOrder(request, Object.fromEntries(request.items.map((item) => [item.productId, item.quantity]))); setSuccessOrder(order); return { protocol: order.protocol, total: cents(order.totalCents), status: order.status }; } }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [createOrder]);

  return <>
    <main className="site-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setActiveTab("shop")} aria-label="Ir para o catálogo"><img src="/logo-aquafolhas.jpeg" alt="AquaFolhas Produtos Sustentáveis" /></button>
        <div className="topbar-note"><span /> Pedidos abertos · (61) 99865-2819</div>
      </header>
      <Tabs value={customerOnly ? "shop" : activeTab} onValueChange={setActiveTab} className="app-tabs">
        {!customerOnly && <div className="nav-wrap"><TabsList className="main-nav" aria-label="Navegação principal"><TabsTrigger value="shop"><ShoppingBasket /> Fazer pedido</TabsTrigger><TabsTrigger value="admin"><ClipboardCheck /> Painel de pedidos</TabsTrigger></TabsList></div>}

        <TabsContent value="shop">
          <section className="shop-intro">
            <div><p className="eyebrow intro-eyebrow">PRODUTOS SUSTENTÁVEIS</p><h1>Mais frescor para a sua mesa.</h1><p>Higienizados, sem agrotóxicos e com protocolo na hora.</p>
              <div className="service-chips"><span><Truck /> Entrega no sábado</span><span><ShoppingBasket /> Retirada domingo · 15% OFF</span></div>
            </div>
            <div className="hero-logo"><img src="/logo-aquafolhas.jpeg" alt="Logo AquaFolhas" /></div>
          </section>

          <div className="shop-layout">
            <section className="catalog" aria-label="Catálogo de produtos">
              <div className="catalog-tools"><label className="search-box"><Search /><span className="sr-only">Buscar produto</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar no catálogo" />{query && <button onClick={() => setQuery("")} aria-label="Limpar busca"><X /></button>}</label>
                <div className="category-row" aria-label="Filtrar por categoria">{categories.map((item) => <Button key={item} variant={category === item ? "default" : "outline"} size="sm" onClick={() => setCategory(item)}>{item}</Button>)}</div>
              </div>
              {filteredProducts.length ? <div className="product-grid">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} quantity={cart[product.id] || 0} onAdd={() => changeQuantity(product.id, 1)} onRemove={() => changeQuantity(product.id, -1)} />)}</div> : <div className="empty-state"><Search /><h2>Nenhum produto encontrado</h2><p>Tente buscar por outro nome.</p></div>}
              <section className="original-catalogs"><div><p className="eyebrow">CATÁLOGOS DA SEMANA</p><h2>Confira os anúncios originais</h2></div><div className="catalog-posters"><a href="/catalogo-higienizados.jpeg" target="_blank"><img src="/catalogo-higienizados.jpeg" alt="Catálogo AquaFolhas de produtos higienizados" /></a><a href="/catalogo-organicos.jpeg" target="_blank"><img src="/catalogo-organicos.jpeg" alt="Catálogo Segunda dos Orgânicos AquaFolhas" /></a></div></section>
            </section>

            <aside className="cart-card" aria-label="Resumo do pedido">
              <div className="cart-heading"><div><p className="eyebrow">SEU PEDIDO</p><h2>{itemCount ? `${itemCount} ${itemCount === 1 ? "item" : "itens"}` : "Carrinho vazio"}</h2></div><span className="basket-count">{itemCount}</span></div>
              {cartLines.length ? <><div className="cart-lines">{cartLines.map((item) => <div className="cart-line" key={item.id}><div><strong>{item.name}</strong><span>{item.quantity} × {cents(item.priceCents)}</span></div><strong>{cents(item.quantity * item.priceCents)}</strong></div>)}</div><div className="cart-total"><span>Subtotal</span><strong>{cents(subtotalCents)}</strong></div><Button size="lg" className="checkout-button" onClick={() => setCheckoutOpen(true)}>Continuar pedido <ChevronRight /></Button><p className="cart-help">Entrega grátis a partir de R$ 30.</p></> : <div className="cart-empty"><ShoppingBasket /><p>Adicione produtos para começar.</p></div>}
            </aside>
          </div>
          {itemCount > 0 && <div className="mobile-cart-bar"><div><span>{itemCount} {itemCount === 1 ? "item" : "itens"}</span><strong>{cents(subtotalCents)}</strong></div><Button onClick={() => setCheckoutOpen(true)}>Revisar pedido</Button></div>}
        </TabsContent>

        {!customerOnly && <TabsContent value="admin">
          <section className="admin-page">
            <div className="admin-heading"><div><p className="eyebrow intro-eyebrow">PAINEL AQUAFOLHAS</p><h1>Pedidos de hoje</h1><p>Atualização automática a cada 8 segundos.</p></div><div className="admin-actions"><Button variant="outline" onClick={() => void loadOrders()} disabled={loadingOrders}><RefreshCw className={loadingOrders ? "spin" : ""} /> Atualizar</Button><Button onClick={() => pendingPrint[0] && handlePrint(pendingPrint[0])} disabled={!pendingPrint.length}><Printer /> Imprimir próximo</Button></div></div>
            <div className="metric-grid"><article><span className="metric-icon lime"><ClipboardCheck /></span><div><span>Pedidos hoje</span><strong>{todayOrders.length}</strong></div></article><article><span className="metric-icon yellow"><WalletCards /></span><div><span>Vendas hoje</span><strong>{cents(todayOrders.reduce((sum, order) => sum + order.totalCents, 0))}</strong></div></article><article><span className="metric-icon blue"><PackageCheck /></span><div><span>Em andamento</span><strong>{openOrders.length}</strong></div></article><article><span className="metric-icon orange"><Printer /></span><div><span>A imprimir</span><strong>{pendingPrint.length}</strong></div></article></div>
            {orderError && <div className="error-banner"><strong>O banco de pedidos ainda não respondeu.</strong><span>{orderError}</span><Button variant="outline" size="sm" onClick={() => void loadOrders()}>Tentar novamente</Button></div>}
            <div className="orders-board"><div className="orders-title"><div><h2>Fila de separação</h2><p>Os pedidos mais novos aparecem primeiro.</p></div><span>{orders.length} no histórico</span></div>
              {loadingOrders && !orders.length ? <div className="empty-state"><RefreshCw className="spin" /><h2>Buscando pedidos</h2></div> : orders.length ? <div className="order-list">{orders.map((order) => <article className={`order-card ${!order.printedAt ? "needs-print" : ""}`} key={order.protocol}><div className="order-main"><div className="order-topline"><div><strong>{order.protocol}</strong><span>{shortDate(order.createdAt)}</span></div><span className={`status-pill ${STATUS[order.status].className}`}>{STATUS[order.status].label}</span></div><h3>{order.customerName}</h3><p>{order.items.map((item) => `${item.quantity}× ${item.productName}`).join(" · ")}</p><div className="order-meta"><span><Truck /> {order.deliveryMethod === "delivery" ? "Entrega sábado" : "Retirada domingo"}</span><span>{order.paymentMethod}</span><strong>{cents(order.totalCents)}</strong></div></div><div className="order-controls"><Select value={order.status} onValueChange={(value) => void updateOrder(order.protocol, { status: value as OrderStatus }).catch((error) => toast.error(error.message))}><SelectTrigger aria-label={`Status do pedido ${order.protocol}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="received">Recebido</SelectItem><SelectItem value="preparing">Separando</SelectItem><SelectItem value="ready">Pronto</SelectItem><SelectItem value="delivered">Entregue</SelectItem></SelectContent></Select><Button variant={order.printedAt ? "outline" : "default"} onClick={() => handlePrint(order)}><Printer /> {order.printedAt ? "Reimprimir" : "Imprimir"}</Button></div></article>)}</div> : <div className="empty-state"><ClipboardCheck /><h2>Nenhum pedido ainda</h2><p>Faça um pedido de teste no catálogo para vê-lo aqui.</p><Button onClick={() => setActiveTab("shop")}>Abrir catálogo</Button></div>}
            </div>
            <section className="report-card"><div><p className="eyebrow">RELATÓRIO RÁPIDO</p><h2>Resumo do movimento</h2></div><div className="report-stats"><span><strong>{orders.length}</strong> pedidos registrados</span><span><strong>{cents(orders.reduce((sum, order) => sum + order.totalCents, 0))}</strong> em vendas</span><span><strong>{orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)}</strong> itens vendidos</span></div></section>
          </section>
        </TabsContent>}
      </Tabs>
    </main>

    <Sheet open={checkoutOpen} onOpenChange={setCheckoutOpen}><SheetContent className="checkout-sheet sm:max-w-[520px]"><SheetHeader><SheetTitle>Finalizar pedido</SheetTitle><SheetDescription>Confira seus produtos e informe como deseja receber.</SheetDescription></SheetHeader><form className="checkout-form" onSubmit={handleCheckout}>
      <div className="checkout-summary">{cartLines.map((item) => <div key={item.id}><span>{item.quantity}× {item.name}</span><strong>{cents(item.quantity * item.priceCents)}</strong></div>)}{discountCents > 0 && <div className="discount-line"><span>Desconto retirada (15%)</span><strong>-{cents(discountCents)}</strong></div>}<div className="checkout-total"><span>Total</span><strong>{cents(totalCents)}</strong></div></div>
      <div className="form-grid"><div className="field"><Label htmlFor="customerName">Seu nome</Label><Input id="customerName" required value={checkout.customerName} onChange={(event) => setCheckout({ ...checkout, customerName: event.target.value })} placeholder="Nome completo" /></div><div className="field"><Label htmlFor="phone">WhatsApp</Label><Input id="phone" required inputMode="tel" value={checkout.phone} onChange={(event) => setCheckout({ ...checkout, phone: event.target.value })} placeholder="(61) 99999-9999" /></div><div className="field"><Label>Como deseja receber?</Label><Select value={checkout.deliveryMethod} onValueChange={(value) => setCheckout({ ...checkout, deliveryMethod: value as "delivery" | "pickup" })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="delivery">Entrega no sábado</SelectItem><SelectItem value="pickup">Retirada domingo · 15% OFF</SelectItem></SelectContent></Select></div><div className="field"><Label>Forma de pagamento</Label><Select value={checkout.paymentMethod} onValueChange={(value) => setCheckout({ ...checkout, paymentMethod: value })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pix">Pix</SelectItem><SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="Cartão na entrega">Cartão na entrega</SelectItem></SelectContent></Select></div>{checkout.deliveryMethod === "delivery" && <div className="field full"><Label htmlFor="address">Endereço de entrega</Label><Input id="address" required value={checkout.address} onChange={(event) => setCheckout({ ...checkout, address: event.target.value })} placeholder="Rua, número, bairro e referência" /><small>Pedido mínimo de R$ 30,00 para entrega grátis.</small></div>}<div className="field full"><Label htmlFor="notes">Observação</Label><Textarea id="notes" value={checkout.notes} onChange={(event) => setCheckout({ ...checkout, notes: event.target.value })} placeholder="Ex.: ponto de referência ou troco" /></div></div>
      <Button type="submit" size="lg" className="checkout-submit" disabled={saving}>{saving ? "Enviando pedido..." : `Enviar pedido · ${cents(totalCents)}`}</Button><p className="secure-note"><Check /> Você receberá um protocolo assim que o pedido for confirmado.</p>
    </form></SheetContent></Sheet>

    <Sheet open={!!successOrder} onOpenChange={(open) => !open && setSuccessOrder(null)}><SheetContent side="bottom" className="success-sheet">{successOrder && <div className="success-content"><img src="/logo-aquafolhas.jpeg" alt="AquaFolhas" /><span className="success-icon"><Check /></span><p className="eyebrow">PEDIDO RECEBIDO</p><SheetTitle>Pronto, {successOrder.customerName.split(" ")[0]}!</SheetTitle><SheetDescription>Guarde seu protocolo. Ele identifica seu pedido.</SheetDescription><div className="protocol-box"><span>Protocolo</span><strong>{successOrder.protocol}</strong><Button variant="ghost" size="icon" onClick={() => void navigator.clipboard.writeText(successOrder.protocol).then(() => toast.success("Protocolo copiado"))}><Copy /></Button></div><div className="success-actions"><Button asChild size="lg"><a href={`https://wa.me/5561998652819?text=${whatsappText(successOrder)}`} target="_blank" rel="noreferrer">Enviar para AquaFolhas no WhatsApp</a></Button><Button variant="outline" size="lg" onClick={() => setSuccessOrder(null)}>Voltar ao catálogo</Button></div></div>}</SheetContent></Sheet>
    <Receipt order={printOrder} /><Toaster position="top-center" richColors />
  </>;
}
