const { formatMoney } = require("../../utils/format");

Page({
  data: {
    orders: []
  },

  onLoad() {
    const orders = [
      {
        id: "demo-1",
        number: "订单 #10001",
        statusText: "制作中",
        products: "拿铁 x1、巴斯克芝士蛋糕 x1",
        createdAt: "今天 14:20",
        totalCents: 5800
      }
    ].map((item) => ({
      ...item,
      totalText: formatMoney(item.totalCents)
    }));

    this.setData({ orders });
  }
});
