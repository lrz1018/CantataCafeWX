const { getOrder } = require("../../services/order");
const { formatMoney, formatDateTime, getStatusText } = require("../../utils/format");

Page({
  data: {
    order: null,
    loading: true
  },

  onLoad(query) {
    const cached = wx.getStorageSync("lastOrder");
    if (cached && cached.id === query.id) {
      this.setOrder(cached);
    }
    this.loadOrder(query.id);
  },

  async loadOrder(id) {
    if (!id) {
      this.setData({ loading: false });
      return;
    }

    try {
      const order = await getOrder(id);
      this.setOrder(order);
    } catch (error) {
      this.setData({ loading: false });
    }
  },

  setOrder(order) {
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
  },

  goMenu() {
    wx.switchTab({
      url: "/pages/menu/menu"
    });
  },

  openOrderDetail() {
    if (!this.data.order) {
      return;
    }

    wx.navigateTo({
      url: `/pages/orders/detail?id=${this.data.order.id}`
    });
  }
});
