const { updateProfile } = require("../../services/user");
const { ensureLogin, refreshCurrentUser } = require("../../utils/auth");
const { normalizeImageUrl } = require("../../utils/format");

const app = getApp();

Page({
  data: {
    nickname: "未登录用户",
    phone: "",
    avatarUrl: "",
    userInitial: "C",
    loggedIn: false,
    saving: false
  },

  onShow() {
    this.syncUser();
    if (app.globalData.token) {
      refreshCurrentUser({ toast: false }).then(() => this.syncUser()).catch(() => this.syncUser());
    }
  },

  syncUser() {
    const user = app.globalData.userInfo || {};
    const nickname = user.nickname || "未登录用户";
    this.setData({
      nickname,
      phone: user.phone || "",
      avatarUrl: normalizeImageUrl(user.avatarUrl),
      userInitial: nickname.slice(0, 1) || "C",
      loggedIn: !!app.globalData.token
    });
  },

  async login() {
    try {
      await ensureLogin();
      await refreshCurrentUser({ toast: false });
      this.syncUser();
      wx.showToast({
        title: "登录成功",
        icon: "success"
      });
    } catch (error) {
      wx.showToast({
        title: "登录失败，请重试",
        icon: "none"
      });
    }
  },

  onNicknameInput(event) {
    this.setData({ nickname: (event.detail.value || "").slice(0, 80) });
  },

  onPhoneInput(event) {
    this.setData({ phone: (event.detail.value || "").slice(0, 32) });
  },

  async saveProfile() {
    if (!this.data.loggedIn) {
      await this.login();
      if (!app.globalData.token) {
        return;
      }
    }

    this.setData({ saving: true });
    try {
      const current = app.globalData.userInfo || {};
      const user = await updateProfile({
        nickname: this.data.nickname || null,
        avatarUrl: current.avatarUrl || null,
        phone: this.data.phone || null
      });
      app.setUserInfo(user);
      this.syncUser();
      wx.showToast({
        title: "已保存",
        icon: "success"
      });
    } catch (error) {
      if (!error || !error.handled) {
        wx.showToast({
          title: error && error.message ? error.message : "保存失败",
          icon: "none"
        });
      }
    } finally {
      this.setData({ saving: false });
    }
  },

  clearCart() {
    app.setCart([]);
    wx.showToast({
      title: "已清空",
      icon: "success"
    });
  },

  logout() {
    app.clearAuth();
    this.syncUser();
    wx.showToast({
      title: "已退出",
      icon: "success"
    });
  }
});
