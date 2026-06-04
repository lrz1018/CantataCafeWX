const { formatMoney } = require("../../utils/format");
const { listProducts } = require("../../services/menu");

Page({
  data: {
    recommendations: [],
    loading: true
  },

  onLoad() {
    this.loadRecommendations();
  },

  async loadRecommendations() {
    this.setData({ loading: true });
    try {
      const products = await listProducts();
      this.setData({
        recommendations: (products || []).slice(0, 3).map((item) => ({
          ...item,
          priceText: formatMoney(item.priceCents)
        })),
        loading: false
      });
    } catch (error) {
      this.setData({
        recommendations: [],
        loading: false
      });
    }
  },

  openProduct(event) {
    wx.navigateTo({
      url: `/pages/product/detail?id=${event.currentTarget.dataset.id}`
    });
  },

  goMenu() {
    wx.switchTab({
      url: "/pages/menu/menu"
    });
  }
});
