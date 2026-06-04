App({
  globalData: {
    userInfo: null,
    token: "",
    cart: []
  },

  onLaunch() {
    const token = wx.getStorageSync("token");
    const cart = wx.getStorageSync("cart");

    this.globalData.token = token || "";
    this.globalData.cart = Array.isArray(cart) ? cart : [];
  },

  setToken(token) {
    this.globalData.token = token;
    wx.setStorageSync("token", token);
  },

  setCart(cart) {
    this.globalData.cart = cart;
    wx.setStorageSync("cart", cart);
  }
});
