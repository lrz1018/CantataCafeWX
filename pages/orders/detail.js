const app = getApp();
const { getOrder, retryOrderPayment } = require("../../services/order");
const { formatMoney, formatDateTime, getPaymentStatusText, getStatusText } = require("../../utils/format");
const { confirmOrderPayment, isPaymentCancel, requestWechatPayment } = require("../../utils/payment");

Page({
  data: {
    order: null,
    loading: true,
    paying: false,
    error: ""
  },

  onLoad(query) {
    this.paymentStopped = false;
    this.loadOrder(query.id);
  },

  onUnload() {
    this.paymentStopped = true;
  },

  onPullDownRefresh() {
    if (!this.data.order) {
      wx.stopPullDownRefresh();
      return;
    }

    this.loadOrder(this.data.order.id).finally(() => wx.stopPullDownRefresh());
  },

  async loadOrder(id) {
    if (!id) {
      this.setData({ loading: false, error: "订单不存在" });
      return;
    }

    this.setData({ loading: true, error: "" });
    try {
      this.setData({
        order: this.normalizeOrder(await getOrder(id)),
        loading: false
      });
    } catch (error) {
      const message = error && error.statusCode === 404
        ? "订单不存在"
        : error && error.statusCode === 403
          ? "无权查看该订单"
          : "订单加载失败";
      this.setData({ loading: false, error: message });
    }
  },

  normalizeOrder(order) {
    const originalTotalCents = Number(order.originalTotalCents == null ? order.totalCents : order.originalTotalCents);
    const discountCents = Number(order.discountCents || 0);
    const paymentActionText = this.getPaymentActionText(order);

    return {
      ...order,
      memberCard: order.memberCard || {},
      statusText: getStatusText(order.status),
      paymentStatusText: getPaymentStatusText(order.paymentStatus),
      paymentActionText,
      showPaymentAction: !!paymentActionText,
      createdAtText: formatDateTime(order.createdAt),
      paidAtText: formatDateTime(order.paidAt),
      originalTotalText: formatMoney(originalTotalCents),
      discountText: formatMoney(discountCents),
      totalText: formatMoney(order.totalCents),
      hasDiscount: discountCents > 0,
      items: (order.items || []).map((item) => ({
        ...item,
        unitPriceText: formatMoney(item.unitPriceCents),
        subtotalText: formatMoney(item.subtotalCents)
      }))
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

  async handleOrderPayment() {
    if (!this.data.order || this.data.paying) {
      return;
    }

    const orderId = this.data.order.id;
    this.setData({ paying: true });

    try {
      const payOrder = await retryOrderPayment(orderId);
      await requestWechatPayment(payOrder.payParams);
      const confirmedOrder = await confirmOrderPayment(orderId, {
        shouldStop: () => !!this.paymentStopped
      });

      if (confirmedOrder) {
        this.setData({ order: this.normalizeOrder(confirmedOrder) });
      }

      if (confirmedOrder && confirmedOrder.paymentStatus === "PAID") {
        if (confirmedOrder.memberCard) {
          app.markMemberCardsDirty();
        }
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
    } catch (error) {
      const message = error && error.message ? error.message : "";
      if (message === "订单已支付" || message === "订单已关闭，不能继续支付") {
        await this.loadOrder(orderId);
        return;
      }

      if (!error || !error.handled) {
        wx.showToast({
          title: isPaymentCancel(error) ? "已取消支付，可继续支付" : message || "支付未完成，请稍后重试",
          icon: "none"
        });
      }
      await this.loadOrder(orderId);
    } finally {
      this.setData({ paying: false });
    }
  }
});
