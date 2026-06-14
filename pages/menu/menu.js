const app = getApp();
const { listCategories, listProducts, getProduct } = require("../../services/menu");
const { createOrder } = require("../../services/order");
const { listMemberCards } = require("../../services/member-card");
const { ensureLogin } = require("../../utils/auth");
const { formatMoney, getMemberCardTypeText, normalizeImageUrl } = require("../../utils/format");
const { confirmOrderPayment, isPaymentCancel, requestWechatPayment } = require("../../utils/payment");

Page({
  data: {
    categories: [],
    products: [],
    filteredProducts: [],
    activeCategoryId: "all",
    searchKeyword: "",
    sectionTitle: "人气咖啡",
    cart: [],
    totalText: "¥0.00",
    totalCount: 0,
    cartSheetVisible: false,
    memberCardLoading: false,
    memberCardError: "",
    memberCards: [],
    availableMemberCards: [],
    selectedMemberCardId: "",
    selectedMemberCard: null,
    memberCardSummary: "未使用会员卡",
    discountText: "¥0.00",
    estimatedPayableText: "¥0.00",
    submitting: false,
    loading: true,
    error: ""
  },

  onLoad() {
    this.loadMenu();
  },

  onShow() {
    this.orderPaymentStopped = false;

    if (app.consumeCatalogDirty()) {
      this.loadMenu();
    }
    this.refreshCart();

    if (app.globalData.token && (app.consumeMemberCardsDirty() || !app.globalData.memberCards.length)) {
      this.loadMemberCards({ toast: false });
    }

    if (app.consumeMenuCartSheetOpen()) {
      this.openCartSheet();
    }
  },

  onPullDownRefresh() {
    this.loadMenu().finally(() => wx.stopPullDownRefresh());
  },

  onUnload() {
    this.orderPaymentStopped = true;
  },

  async loadMenu() {
    this.setData({ loading: true, error: "" });

    try {
      const [categories, products] = await Promise.all([
        listCategories(),
        listProducts()
      ]);

      const normalizedProducts = this.decorateProductsWithCart((products || []).map((item) => this.normalizeProduct(item)));
      const normalizedCategories = [
        { id: "all", name: "全部" },
        ...(categories || [])
      ];

      this.setData({
        categories: normalizedCategories,
        products: normalizedProducts,
        loading: false
      });
      this.applyFilter(this.data.activeCategoryId, normalizedProducts, this.data.searchKeyword);
    } catch (error) {
      this.setData({
        loading: false,
        error: "菜单加载失败，请下拉重试"
      });
    }
  },

  refreshCart() {
    const cart = app.globalData.cart.map((item) => ({
      ...item,
      priceText: formatMoney(item.unitPriceCents)
    }));
    const total = cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const memberCardState = this.getMemberCardState(cart, total, this.data.selectedMemberCardId);
    const products = this.decorateProductsWithCart(this.data.products);

    this.setData({
      cart,
      totalText: formatMoney(total),
      totalCount,
      products,
      ...memberCardState
    });
    this.applyFilter(this.data.activeCategoryId, products, this.data.searchKeyword);
  },

  calculateCartTotal(cart) {
    return cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  },

  getMemberCardState(cart, total, selectedId) {
    const cards = (app.globalData.memberCards || []).map((card) => this.normalizeCheckoutMemberCard(card, cart));
    const availableMemberCards = cards.filter((card) => card.available);
    const selectedMemberCard = availableMemberCards.find((card) => card.id === selectedId) || null;
    const discountCents = selectedMemberCard ? selectedMemberCard.discountCents : 0;
    const estimatedPayableCents = Math.max(total - discountCents, 0);

    return {
      memberCards: cards,
      availableMemberCards,
      selectedMemberCardId: selectedMemberCard ? selectedMemberCard.id : "",
      selectedMemberCard,
      memberCardSummary: selectedMemberCard
        ? `${selectedMemberCard.name}，预计优惠 ${formatMoney(discountCents)}`
        : "未使用会员卡",
      discountText: formatMoney(discountCents),
      estimatedPayableText: formatMoney(estimatedPayableCents)
    };
  },

  normalizeCheckoutMemberCard(card, cart) {
    const base = {
      ...card,
      typeText: getMemberCardTypeText(card.type),
      productText: (card.products || []).map((item) => item.name).filter(Boolean).join("、"),
      available: false,
      disabledReason: "",
      discountProductName: "",
      discountCents: 0,
      discountText: formatMoney(0),
      estimatedPayableText: formatMoney(this.calculateCartTotal(cart))
    };

    if (card.status !== "ACTIVE" || card.expired) {
      return { ...base, disabledReason: "会员卡已失效" };
    }

    if (card.usedToday) {
      return { ...base, disabledReason: "今日已使用" };
    }

    const productIds = (card.products || []).map((item) => item.id);
    const target = cart
      .filter((item) => productIds.includes(item.productId))
      .sort((a, b) => Number(b.unitPriceCents || 0) - Number(a.unitPriceCents || 0))[0];

    if (!target) {
      return { ...base, disabledReason: "当前购物车不可用" };
    }

    const unitPriceCents = Number(target.unitPriceCents || 0);
    const discountCents = card.type === "HALF_PRICE" ? Math.floor(unitPriceCents / 2) : unitPriceCents;
    const estimatedPayableCents = Math.max(this.calculateCartTotal(cart) - discountCents, 0);

    return {
      ...base,
      available: true,
      discountProductName: target.name,
      discountCents,
      discountText: formatMoney(discountCents),
      estimatedPayableText: formatMoney(estimatedPayableCents)
    };
  },

  async loadMemberCards(options = {}) {
    if (!app.globalData.token) {
      app.setMemberCards([]);
      this.refreshCart();
      return;
    }

    this.setData({ memberCardLoading: true, memberCardError: "" });

    try {
      const cards = await listMemberCards({ toast: options.toast });
      app.setMemberCards(cards || []);
      this.refreshCart();
      this.setData({ memberCardLoading: false });
    } catch (error) {
      this.setData({
        memberCardLoading: false,
        memberCardError: "会员卡加载失败"
      });
    }
  },

  normalizeProduct(product) {
    const soldOut = product.stockEnabled && Number(product.stockQuantity || 0) <= 0;
    return {
      ...product,
      imageSrc: normalizeImageUrl(product.imageUrl),
      priceText: formatMoney(product.priceCents),
      stockText: product.stockEnabled
        ? soldOut ? "售罄" : `剩余 ${product.stockQuantity}`
        : "",
      addText: soldOut ? "售罄" : "加入",
      soldOut
    };
  },

  decorateProductsWithCart(products) {
    const quantityMap = app.globalData.cart.reduce((map, item) => {
      map[item.productId] = Number(item.quantity || 0);
      return map;
    }, {});

    return (products || []).map((item) => ({
      ...item,
      cartQuantity: quantityMap[item.id] || 0
    }));
  },

  selectCategory(event) {
    const id = event.currentTarget.dataset.id;
    this.applyFilter(id, this.data.products, this.data.searchKeyword);
  },

  handleSearchInput(event) {
    this.applyFilter(this.data.activeCategoryId, this.data.products, event.detail.value);
  },

  clearSearch() {
    this.applyFilter(this.data.activeCategoryId, this.data.products, "");
  },

  applyFilter(id, products, keyword = "") {
    const currentCategory = this.data.categories.find((item) => item.id === id);
    const normalizedKeyword = String(keyword || "").trim().toLowerCase();
    const categoryProducts = id === "all"
      ? products
      : products.filter((item) => item.categoryId === id);
    const filteredProducts = normalizedKeyword
      ? categoryProducts.filter((item) => {
          const text = `${item.name || ""} ${item.description || ""}`.toLowerCase();
          return text.includes(normalizedKeyword);
        })
      : categoryProducts;

    this.setData({
      activeCategoryId: id,
      searchKeyword: keyword,
      filteredProducts,
      sectionTitle: id === "all"
        ? (normalizedKeyword ? "搜索结果" : "人气咖啡")
        : (currentCategory && currentCategory.name ? currentCategory.name : "商品")
    });
  },

  addToCart(event) {
    const product = event.detail && event.detail.id
      ? event.detail
      : this.data.products.find((item) => item.id === event.currentTarget.dataset.id);
    if (!product) {
      return;
    }

    if (product.soldOut) {
      wx.showToast({
        title: "商品已售罄",
        icon: "none"
      });
      return;
    }

    const cart = app.globalData.cart.slice();
    const index = cart.findIndex((item) => item.productId === product.id);
    const nextQuantity = index >= 0 ? cart[index].quantity + 1 : 1;

    if (product.stockEnabled && nextQuantity > Number(product.stockQuantity || 0)) {
      wx.showToast({
        title: "库存不足",
        icon: "none"
      });
      return;
    }

    if (index >= 0) {
      cart[index] = {
        ...cart[index],
        quantity: nextQuantity,
        stockQuantity: product.stockQuantity
      };
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        imageUrl: product.imageUrl || "",
        imageSrc: product.imageSrc || "",
        unitPriceCents: product.priceCents,
        quantity: 1,
        stockEnabled: !!product.stockEnabled,
        stockQuantity: Number(product.stockQuantity || 0)
      });
    }

    app.setCart(cart);
    this.refreshCart();
  },

  openProduct(event) {
    const id = event.detail && event.detail.id ? event.detail.id : event.currentTarget.dataset.id;
    if (!id) {
      return;
    }

    wx.navigateTo({
      url: `/pages/product/detail?id=${id}`
    });
  },

  openCartSheet() {
    this.refreshCart();
    this.setData({ cartSheetVisible: true });
    if (app.globalData.token) {
      this.loadMemberCards({ toast: false });
    }
  },

  closeCartSheet() {
    this.setData({ cartSheetVisible: false });
  },

  stopPropagation() {},

  increase(event) {
    this.updateCount(event.currentTarget.dataset.id, 1);
  },

  decrease(event) {
    this.updateCount(event.currentTarget.dataset.id, -1);
  },

  updateCount(id, delta) {
    const cart = app.globalData.cart
      .map((item) => {
        if (item.productId !== id) {
          return item;
        }

        const quantity = item.quantity + delta;
        if (delta > 0 && item.stockEnabled && quantity > Number(item.stockQuantity || 0)) {
          wx.showToast({
            title: "库存不足",
            icon: "none"
          });
          return item;
        }

        return { ...item, quantity };
      })
      .filter((item) => item.quantity > 0);

    app.setCart(cart);
    this.refreshCart();
  },

  selectMemberCard(event) {
    const id = event.currentTarget.dataset.id;
    const nextSelectedId = id === this.data.selectedMemberCardId ? "" : id;
    const cart = app.globalData.cart.map((item) => ({
      ...item,
      priceText: formatMoney(item.unitPriceCents)
    }));
    const total = this.calculateCartTotal(cart);

    this.setData(this.getMemberCardState(cart, total, nextSelectedId));
  },

  clearMemberCard() {
    const cart = app.globalData.cart.map((item) => ({
      ...item,
      priceText: formatMoney(item.unitPriceCents)
    }));
    const total = this.calculateCartTotal(cart);

    this.setData(this.getMemberCardState(cart, total, ""));
  },

  async validateCartWithProducts() {
    const cart = app.globalData.cart;
    const products = await Promise.all(cart.map((item) => getProduct(item.productId)));
    const productMap = products.reduce((map, product) => {
      map[product.id] = product;
      return map;
    }, {});

    const nextCart = cart.map((item) => {
      const product = productMap[item.productId];
      if (!product) {
        throw new Error(`${item.name || "商品"} 不存在或已下架`);
      }

      const stockQuantity = Number(product.stockQuantity || 0);
      if (product.stockEnabled && item.quantity > stockQuantity) {
        throw new Error(`${product.name} 库存不足`);
      }

      return {
        ...item,
        name: product.name,
        imageUrl: product.imageUrl || "",
        imageSrc: normalizeImageUrl(product.imageUrl),
        unitPriceCents: product.priceCents,
        stockEnabled: !!product.stockEnabled,
        stockQuantity
      };
    });

    app.setCart(nextCart);
    this.refreshCart();
  },

  async checkout() {
    if (this.data.submitting) {
      return;
    }

    if (!app.globalData.cart.length) {
      wx.showToast({
        title: "购物车为空",
        icon: "none"
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      await ensureLogin();
      await this.validateCartWithProducts();

      const payload = {
        items: app.globalData.cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      };

      if (this.data.selectedMemberCardId) {
        payload.memberCardId = this.data.selectedMemberCardId;
      }

      const usedMemberCard = !!payload.memberCardId;
      let order = await createOrder(payload);

      app.clearCart();
      app.markCatalogDirty();
      if (usedMemberCard) {
        app.markMemberCardsDirty();
      }
      this.setData({
        cartSheetVisible: false,
        selectedMemberCardId: "",
        selectedMemberCard: null
      });

      if (order.payParams && order.paymentStatus !== "PAID") {
        try {
          wx.showLoading({ title: "正在支付..." });
          await requestWechatPayment(order.payParams);
          wx.hideLoading();
          wx.showLoading({ title: "确认支付结果..." });
          const confirmedOrder = await confirmOrderPayment(order.id, {
            shouldStop: () => !!this.orderPaymentStopped
          });
          if (confirmedOrder) {
            order = confirmedOrder;
          }

          if (order.paymentStatus === "PAID") {
            wx.showToast({
              title: "支付成功",
              icon: "success"
            });
          } else if (order.paymentStatus === "PENDING") {
            wx.showToast({
              title: "支付结果确认中，请稍后刷新",
              icon: "none"
            });
          }
        } catch (payError) {
          wx.hideLoading();
          wx.showToast({
            title: isPaymentCancel(payError) ? "已取消支付，可在订单详情继续支付" : "支付未完成，请稍后重试",
            icon: "none"
          });
        } finally {
          wx.hideLoading();
        }
      }

      wx.setStorageSync("lastOrder", order);
      wx.navigateTo({
        url: order.paymentStatus === "PAID"
          ? `/pages/order/success?id=${order.id}`
          : `/pages/orders/detail?id=${order.id}`
      });
    } catch (error) {
      const message = error && error.message ? error.message : "";
      if (["会员卡已失效", "该会员卡今日已使用", "订单中没有该会员卡可用商品"].includes(message)) {
        this.clearMemberCard();
        app.markMemberCardsDirty();
        this.loadMemberCards({ toast: false });
      }

      if (!error || !error.handled) {
        wx.showToast({
          title: message || "下单失败，请重试",
          icon: "none"
        });
      }
    } finally {
      this.setData({ submitting: false });
      this.refreshCart();
    }
  },

  checkoutFromBar() {
    if (this.data.submitting || !app.globalData.cart.length) {
      return;
    }

    this.checkout();
  }
});
