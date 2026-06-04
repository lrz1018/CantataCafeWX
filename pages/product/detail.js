const app = getApp();
const { getProduct } = require("../../services/menu");
const { formatMoney, normalizeImageUrl } = require("../../utils/format");

Page({
  data: {
    product: null,
    loading: true,
    error: ""
  },

  onLoad(query) {
    this.loadProduct(query.id);
  },

  async loadProduct(id) {
    if (!id) {
      this.setData({ loading: false, error: "商品不存在" });
      return;
    }

    this.setData({ loading: true, error: "" });
    try {
      const product = await getProduct(id);
      const soldOut = product.stockEnabled && Number(product.stockQuantity || 0) <= 0;
      this.setData({
        product: {
          ...product,
          imageSrc: normalizeImageUrl(product.imageUrl),
          itemInitial: product.name ? product.name.slice(0, 1) : "C",
          descriptionText: product.description || "暂无描述",
          priceText: formatMoney(product.priceCents),
          stockText: product.stockEnabled
            ? soldOut ? "售罄" : `剩余 ${product.stockQuantity}`
            : "现点现做",
          addText: soldOut ? "已售罄" : "加入购物车",
          soldOut
        },
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false, error: "商品加载失败" });
    }
  },

  addToCart() {
    const product = this.data.product;
    if (!product || product.soldOut) {
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

  goCart() {
    wx.switchTab({
      url: "/pages/cart/cart"
    });
  }
});
