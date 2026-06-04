const { listOrders } = require("../../services/order");
const { ensureLogin } = require("../../utils/auth");
const { formatMoney, formatDateTime, getStatusText, summarizeOrderItems } = require("../../utils/format");

const app = getApp();

Page({
  data: {
    orders: [],
    loading: false,
    loginRequired: false
  },

  onShow() {
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders().finally(() => wx.stopPullDownRefresh());
  },

  async loadOrders() {
    if (!app.globalData.token) {
      this.setData({
        orders: [],
        loading: false,
        loginRequired: true
      });
      return;
    }

    this.setData({ loading: true, loginRequired: false });
    try {
      const orders = await listOrders();
      this.setData({
        orders: (orders || []).map((item) => ({
          ...item,
          number: `取餐号 ${item.pickupNo}`,
          statusText: getStatusText(item.status),
          products: summarizeOrderItems(item.items || []),
          createdAtText: formatDateTime(item.createdAt),
          totalText: formatMoney(item.totalCents)
        })),
        loading: false
      });
    } catch (error) {
      this.setData({
        loading: false,
        loginRequired: !app.globalData.token
      });
    }
  },

  async loginAndLoad() {
    try {
      await ensureLogin();
      await this.loadOrders();
    } catch (error) {
      wx.showToast({
        title: "登录失败，请重试",
        icon: "none"
      });
    }
  },

  openDetail(event) {
    wx.navigateTo({
      url: `/pages/orders/detail?id=${event.currentTarget.dataset.id}`
    });
  }
});
