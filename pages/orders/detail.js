const { getOrder } = require("../../services/order");
const { formatMoney, formatDateTime, getStatusText } = require("../../utils/format");

Page({
  data: {
    order: null,
    loading: true,
    error: ""
  },

  onLoad(query) {
    this.loadOrder(query.id);
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
      const order = await getOrder(id);
      const originalTotalCents = Number(order.originalTotalCents == null ? order.totalCents : order.originalTotalCents);
      const discountCents = Number(order.discountCents || 0);
      this.setData({
        order: {
          ...order,
          memberCard: order.memberCard || {},
          statusText: getStatusText(order.status),
          createdAtText: formatDateTime(order.createdAt),
          originalTotalText: formatMoney(originalTotalCents),
          discountText: formatMoney(discountCents),
          totalText: formatMoney(order.totalCents),
          hasDiscount: discountCents > 0,
          items: (order.items || []).map((item) => ({
            ...item,
            unitPriceText: formatMoney(item.unitPriceCents),
            subtotalText: formatMoney(item.subtotalCents)
          }))
        },
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false, error: "订单加载失败" });
    }
  }
});
