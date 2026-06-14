const { listProducts } = require("../../services/menu");

function formatHomePrice(cents) {
  const value = Number(cents || 0) / 100;
  return Number.isInteger(value) ? `¥${value}` : `¥${value.toFixed(2)}`;
}

Page({
  data: {
    featuredProduct: null,
    hotProducts: [],
    loading: true,
    error: "",
    statusBarHeight: 20,
    navBarHeight: 44,
    navTotalHeight: 64,
    navRightSpace: 96
  },

  onLoad() {
    this.setupNavigation();
    this.loadHomeProducts();
  },

  onPullDownRefresh() {
    this.loadHomeProducts().finally(() => wx.stopPullDownRefresh());
  },

  setupNavigation() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      const menuButton = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
      const statusBarHeight = systemInfo.statusBarHeight || 20;
      const navBarHeight = menuButton
        ? menuButton.height + (menuButton.top - statusBarHeight) * 2
        : 44;
      const navRightSpace = menuButton
        ? Math.max(systemInfo.windowWidth - menuButton.left + 12, 96)
        : 96;

      this.setData({
        statusBarHeight,
        navBarHeight,
        navTotalHeight: statusBarHeight + navBarHeight,
        navRightSpace
      });
    } catch (error) {
      this.setData({
        statusBarHeight: 20,
        navBarHeight: 44,
        navTotalHeight: 64,
        navRightSpace: 96
      });
    }
  },

  async loadHomeProducts() {
    this.setData({ loading: true, error: "" });
    try {
      const products = await listProducts();
      const homeProducts = (products || []).slice(0, 3).map((item) => this.normalizeHomeProduct(item));
      const hotProducts = homeProducts.slice(1, 3).map((item, index) => ({
        ...item,
        toneClass: index === 0 ? "primary" : "secondary",
        showFoam: index === 1
      }));

      this.setData({
        featuredProduct: homeProducts[0] || null,
        hotProducts,
        loading: false
      });
    } catch (error) {
      this.setData({
        featuredProduct: null,
        hotProducts: [],
        loading: false,
        error: "商品加载失败，请下拉重试"
      });
    }
  },

  normalizeHomeProduct(product) {
    return {
      ...product,
      descriptionText: product.description || "丝滑燕麦奶搭配轻盈奶盖，唤醒今天的第一杯。",
      priceText: formatHomePrice(product.priceCents)
    };
  },

  openProduct(event) {
    const id = event.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({
        url: `/pages/product/detail?id=${id}`
      });
    }
  },

  goMenu() {
    wx.switchTab({
      url: "/pages/menu/menu"
    });
  }
});
