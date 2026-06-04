const { formatMoney } = require("../../utils/format");

const app = getApp();

Page({
  data: {
    cart: [],
    totalText: "¥0.00"
  },

  onShow() {
    this.refreshCart();
  },

  refreshCart() {
    const cart = app.globalData.cart.map((item) => ({
      ...item,
      priceText: formatMoney(item.priceCents)
    }));
    const total = cart.reduce((sum, item) => sum + item.priceCents * item.count, 0);

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
      .map((item) => item.id === id ? { ...item, count: item.count + delta } : item)
      .filter((item) => item.count > 0);

    app.setCart(cart);
    this.refreshCart();
  },

  checkout() {
    wx.showToast({
      title: "订单接口待接入",
      icon: "none"
    });
  },

  goMenu() {
    wx.switchTab({
      url: "/pages/menu/menu"
    });
  }
});
