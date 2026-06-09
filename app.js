App({
  globalData: {
    userInfo: null,
    token: "",
    tokenType: "Bearer",
    cart: [],
    memberCards: [],
    memberCardsNeedRefresh: false,
    catalogNeedsRefresh: false,
    menuCartSheetNeedsOpen: false
  },

  onLaunch() {
    const token = wx.getStorageSync("token");
    const tokenType = wx.getStorageSync("tokenType");
    const userInfo = wx.getStorageSync("userInfo");
    const cart = wx.getStorageSync("cart");

    this.globalData.token = token || "";
    this.globalData.tokenType = tokenType || "Bearer";
    this.globalData.userInfo = userInfo || null;
    this.globalData.cart = Array.isArray(cart) ? cart.map((item) => this.normalizeCartItem(item)) : [];
    wx.setStorageSync("cart", this.globalData.cart);
  },

  normalizeCartItem(item) {
    return {
      productId: item.productId || item.id,
      name: item.name,
      imageUrl: item.imageUrl || "",
      imageSrc: item.imageSrc || "",
      unitPriceCents: item.unitPriceCents || item.priceCents || 0,
      quantity: item.quantity || item.count || 1,
      stockEnabled: !!item.stockEnabled,
      stockQuantity: Number(item.stockQuantity || 0)
    };
  },

  setAuth(auth = {}) {
    const token = auth.token || "";
    const tokenType = auth.tokenType || "Bearer";
    const userInfo = auth.user || auth.userInfo || null;

    this.globalData.token = token;
    this.globalData.tokenType = tokenType;
    this.globalData.userInfo = userInfo;
    this.markMemberCardsDirty();
    wx.setStorageSync("token", token);
    wx.setStorageSync("tokenType", tokenType);
    wx.setStorageSync("userInfo", userInfo);
  },

  setToken(token, tokenType = "Bearer") {
    this.globalData.token = token || "";
    this.globalData.tokenType = tokenType || "Bearer";
    wx.setStorageSync("token", this.globalData.token);
    wx.setStorageSync("tokenType", this.globalData.tokenType);
  },

  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo || null;
    wx.setStorageSync("userInfo", this.globalData.userInfo);
  },

  clearAuth() {
    this.globalData.token = "";
    this.globalData.tokenType = "Bearer";
    this.globalData.userInfo = null;
    this.globalData.memberCards = [];
    this.globalData.memberCardsNeedRefresh = false;
    wx.removeStorageSync("token");
    wx.removeStorageSync("tokenType");
    wx.removeStorageSync("userInfo");
  },

  setCart(cart) {
    this.globalData.cart = cart;
    wx.setStorageSync("cart", cart);
  },

  clearCart() {
    this.setCart([]);
  },

  setMemberCards(cards) {
    this.globalData.memberCards = Array.isArray(cards) ? cards : [];
    this.globalData.memberCardsNeedRefresh = false;
  },

  markMemberCardsDirty() {
    this.globalData.memberCardsNeedRefresh = true;
  },

  consumeMemberCardsDirty() {
    const dirty = this.globalData.memberCardsNeedRefresh;
    this.globalData.memberCardsNeedRefresh = false;
    return dirty;
  },

  markCatalogDirty() {
    this.globalData.catalogNeedsRefresh = true;
  },

  consumeCatalogDirty() {
    const dirty = this.globalData.catalogNeedsRefresh;
    this.globalData.catalogNeedsRefresh = false;
    return dirty;
  },

  markMenuCartSheetOpen() {
    this.globalData.menuCartSheetNeedsOpen = true;
  },

  consumeMenuCartSheetOpen() {
    const shouldOpen = this.globalData.menuCartSheetNeedsOpen;
    this.globalData.menuCartSheetNeedsOpen = false;
    return shouldOpen;
  }
});
