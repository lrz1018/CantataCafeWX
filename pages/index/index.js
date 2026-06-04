const { formatMoney } = require("../../utils/format");

Page({
  data: {
    recommendations: [
      {
        id: "latte",
        name: "榛果拿铁",
        description: "浓缩咖啡、蒸汽牛奶与榛果香气。",
        priceCents: 2800
      },
      {
        id: "americano",
        name: "冰美式",
        description: "清爽干净，适合午后提神。",
        priceCents: 2200
      }
    ]
  },

  onLoad() {
    this.setData({
      recommendations: this.data.recommendations.map((item) => ({
        ...item,
        priceText: formatMoney(item.priceCents)
      }))
    });
  },

  goMenu() {
    wx.switchTab({
      url: "/pages/menu/menu"
    });
  }
});
