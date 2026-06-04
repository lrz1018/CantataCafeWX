const app = getApp();
const { listBanners, listCategories, listProducts } = require("../../services/menu");
const { formatMoney, normalizeImageUrl } = require("../../utils/format");

Page({
  data: {
    banners: [],
    categories: [],
    products: [],
    filteredProducts: [],
    activeCategoryId: "all",
    loading: true,
    error: ""
  },

  onLoad() {
    this.loadMenu();
  },

  onShow() {
    if (app.consumeCatalogDirty()) {
      this.loadMenu();
    }
  },

  onPullDownRefresh() {
    this.loadMenu().finally(() => wx.stopPullDownRefresh());
  },

  async loadMenu() {
    this.setData({ loading: true, error: "" });

    try {
      const [banners, categories, products] = await Promise.all([
        listBanners(),
        listCategories(),
        listProducts()
      ]);

      const normalizedProducts = (products || []).map((item) => this.normalizeProduct(item));
      const normalizedCategories = [
        { id: "all", name: "全部" },
        ...(categories || [])
      ];

      this.setData({
        banners: (banners || []).map((item) => ({
          ...item,
          imageSrc: normalizeImageUrl(item.imageUrl)
        })),
        categories: normalizedCategories,
        products: normalizedProducts,
        loading: false
      });
      this.applyFilter(this.data.activeCategoryId, normalizedProducts);
    } catch (error) {
      this.setData({
        loading: false,
        error: "菜单加载失败，请下拉重试"
      });
    }
  },

  normalizeProduct(product) {
    const soldOut = product.stockEnabled && Number(product.stockQuantity || 0) <= 0;
    return {
      ...product,
      imageSrc: normalizeImageUrl(product.imageUrl),
      priceText: formatMoney(product.priceCents),
      stockText: product.stockEnabled
        ? soldOut ? "售罄" : `剩余 ${product.stockQuantity}`
        : "",
      addText: soldOut ? "售罄" : "加入",
      soldOut
    };
  },

  selectCategory(event) {
    const id = event.currentTarget.dataset.id;
    this.applyFilter(id, this.data.products);
  },

  applyFilter(id, products) {
    const filteredProducts = id === "all"
      ? products
      : products.filter((item) => item.categoryId === id);

    this.setData({
      activeCategoryId: id,
      filteredProducts
    });
  },

  addToCart(event) {
    const product = event.detail;
    if (product.soldOut) {
      wx.showToast({
        title: "商品已售罄",
        icon: "none"
      });
      return;
    }

    const cart = app.globalData.cart.slice();
    const index = cart.findIndex((item) => item.productId === product.id);
    const nextQuantity = index >= 0 ? cart[index].quantity + 1 : 1;

    if (product.stockEnabled && nextQuantity > Number(product.stockQuantity || 0)) {
      wx.showToast({
        title: "库存不足",
        icon: "none"
      });
      return;
    }

    if (index >= 0) {
      cart[index] = {
        ...cart[index],
        quantity: nextQuantity,
        stockQuantity: product.stockQuantity
      };
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        imageUrl: product.imageUrl || "",
        imageSrc: product.imageSrc || "",
        unitPriceCents: product.priceCents,
        quantity: 1,
        stockEnabled: !!product.stockEnabled,
        stockQuantity: Number(product.stockQuantity || 0)
      });
    }

    app.setCart(cart);
    wx.showToast({
      title: "已加入购物车",
      icon: "success"
    });
  },

  openProduct(event) {
    const id = event.detail.id;
    wx.navigateTo({
      url: `/pages/product/detail?id=${id}`
    });
  },

  handleBannerTap(event) {
    const linkUrl = event.currentTarget.dataset.link || "";
    const match = linkUrl.match(/^cttcafe:\/\/product\/(.+)$/);
    if (match && match[1]) {
      wx.navigateTo({
        url: `/pages/product/detail?id=${match[1]}`
      });
    }
  }
});
