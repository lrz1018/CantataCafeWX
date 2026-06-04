const { formatMoney } = require("../../utils/format");
const { getProduct } = require("../../services/menu");
const { createOrder } = require("../../services/order");
const { ensureLogin } = require("../../utils/auth");

const app = getApp();

Page({
  data: {
    cart: [],
    totalText: "¥0.00",
    remark: "",
    remarkLength: 0,
    submitting: false
  },

  onShow() {
    this.refreshCart();
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

  onRemarkInput(event) {
    const value = event.detail.value || "";
    const remark = value.slice(0, 255);
    this.setData({
      remark,
      remarkLength: remark.length
    });
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

    if ((this.data.remark || "").length > 255) {
      wx.showToast({
        title: "备注不能超过255字",
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
        })),
        remark: this.data.remark || null
      });

      app.clearCart();
      app.markCatalogDirty();
      wx.setStorageSync("lastOrder", order);
      this.setData({ remark: "", remarkLength: 0 });
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

  goMenu() {
    wx.switchTab({
      url: "/pages/menu/menu"
    });
  }
});
