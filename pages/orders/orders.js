const { listOrders, retryOrderPayment } = require("../../services/order");
const { ensureLogin } = require("../../utils/auth");
const { formatMoney, formatDateTime, getPaymentStatusText, getStatusText, summarizeOrderItems } = require("../../utils/format");
const { confirmOrderPayment, isPaymentCancel, requestWechatPayment } = require("../../utils/payment");

const app = getApp();

Page({
  data: {
    orders: [],
    loading: false,
    loginRequired: false,
    payingOrderId: ""
  },

  onShow() {
    this.paymentStopped = false;
    this.loadOrders();
  },

  onUnload() {
    this.paymentStopped = true;
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
        orders: (orders || []).map((item) => this.normalizeOrder(item)),
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
  },

  normalizeOrder(order) {
    const discountCents = Number(order.discountCents || 0);
    const paymentActionText = this.getPaymentActionText(order);
    return {
      ...order,
      memberCard: order.memberCard || {},
      number: `取餐号 ${order.pickupNo}`,
      statusText: getStatusText(order.status),
      paymentStatusText: getPaymentStatusText(order.paymentStatus),
      paymentActionText,
      showPaymentAction: !!paymentActionText,
      products: summarizeOrderItems(order.items || []),
      createdAtText: formatDateTime(order.createdAt),
      totalText: formatMoney(order.totalCents),
      discountText: formatMoney(discountCents),
      hasDiscount: discountCents > 0
    };
  },

  getPaymentActionText(order) {
    if (!order || order.status === "CANCELLED") {
      return "";
    }

    if (order.paymentStatus === "PENDING") {
      return "继续支付";
    }

    if (order.paymentStatus === "FAILED") {
      return "重新支付";
    }

    return "";
  },

  async handleOrderPayment(event) {
    const orderId = event.currentTarget.dataset.id;
    if (!orderId || this.data.payingOrderId) {
      return;
    }

    this.setData({ payingOrderId: orderId });

    try {
      const payOrder = await retryOrderPayment(orderId);
      await requestWechatPayment(payOrder.payParams);
      const confirmedOrder = await confirmOrderPayment(orderId, {
        shouldStop: () => !!this.paymentStopped
      });

      if (confirmedOrder && confirmedOrder.paymentStatus === "PAID") {
        wx.showToast({
          title: "支付成功",
          icon: "success"
        });
      } else {
        wx.showToast({
          title: "支付结果确认中，请稍后刷新",
          icon: "none"
        });
      }

      await this.loadOrders();
    } catch (error) {
      const message = error && error.message ? error.message : "";
      if (message === "订单已支付" || message === "订单已关闭，不能继续支付") {
        await this.loadOrders();
        return;
      }

      if (!error || !error.handled) {
        wx.showToast({
          title: isPaymentCancel(error) ? "已取消支付，可继续支付" : message || "支付未完成，请稍后重试",
          icon: "none"
        });
      }
      await this.loadOrders();
    } finally {
      this.setData({ payingOrderId: "" });
    }
  }
});
