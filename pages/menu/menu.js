const app = getApp();
const { listBanners, listCategories, listProducts, getProduct } = require("../../services/menu");
const { createOrder } = require("../../services/order");
const { ensureLogin } = require("../../utils/auth");
const { formatMoney, normalizeImageUrl } = require("../../utils/format");

Page({
  data: {
    banners: [],
    categories: [],
    products: [],
    filteredProducts: [],
    activeCategoryId: "all",
    cart: [],
    totalText: "¥0.00",
    cartSheetVisible: false,
    submitting: false,
    loading: true,
    error: ""
  },

  onLoad() {
    this.loadMenu();
  },

  onShow() {
    if (app.consumeCatalogDirty()) {
      this.loadMenu();
    }
    this.refreshCart();

    if (app.consumeMenuCartSheetOpen()) {
      this.openCartSheet();
    }
  },

  onPullDownRefresh() {
    this.loadMenu().finally(() => wx.stopPullDownRefresh());
  },

  async loadMenu() {
    this.setData({ loading: true, error: "" });

    try {
      const [banners, categories, products] = await Promise.all([
        listBanners(),
        listCategories(),
        listProducts()
      ]);

      const normalizedProducts = (products || []).map((item) => this.normalizeProduct(item));
      const normalizedCategories = [
        { id: "all", name: "全部" },
        ...(categories || [])
      ];

      this.setData({
        banners: (banners || []).map((item) => ({
          ...item,
          imageSrc: normalizeImageUrl(item.imageUrl)
        })),
        categories: normalizedCategories,
        products: normalizedProducts,
        loading: false
      });
      this.applyFilter(this.data.activeCategoryId, normalizedProducts);
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

    this.setData({
      cart,
      totalText: formatMoney(total)
    });
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

  selectCategory(event) {
    const id = event.currentTarget.dataset.id;
    this.applyFilter(id, this.data.products);
  },

  applyFilter(id, products) {
    const filteredProducts = id === "all"
      ? products
      : products.filter((item) => item.categoryId === id);

    this.setData({
      activeCategoryId: id,
      filteredProducts
    });
  },

  addToCart(event) {
    const product = event.detail;
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
    wx.showToast({
      title: "已加入购物车",
      icon: "success"
    });
  },

  openProduct(event) {
    const id = event.detail.id;
    wx.navigateTo({
      url: `/pages/product/detail?id=${id}`
    });
  },

  handleBannerTap(event) {
    const linkUrl = event.currentTarget.dataset.link || "";
    const match = linkUrl.match(/^cttcafe:\/\/product\/(.+)$/);
    if (match && match[1]) {
      wx.navigateTo({
        url: `/pages/product/detail?id=${match[1]}`
      });
    }
  },

  openCartSheet() {
    this.refreshCart();
    this.setData({ cartSheetVisible: true });
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

      const order = await createOrder({
        items: app.globalData.cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      });

      app.clearCart();
      app.markCatalogDirty();
      wx.setStorageSync("lastOrder", order);
      this.setData({ cartSheetVisible: false });
      wx.navigateTo({
        url: `/pages/order/success?id=${order.id}`
      });
    } catch (error) {
      if (!error || !error.handled) {
        wx.showToast({
          title: error && error.message ? error.message : "下单失败，请重试",
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
