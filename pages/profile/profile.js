const { loginByWechat } = require("../../services/user");

const app = getApp();

Page({
  data: {
    nickname: "未登录用户",
    userInitial: "C"
  },

  login() {
    wx.login({
      success: async (res) => {
        if (!res.code) {
          wx.showToast({
            title: "获取登录凭证失败",
            icon: "none"
          });
          return;
        }

        try {
          const data = await loginByWechat(res.code);
          if (data && data.token) {
            app.setToken(data.token);
          }
          wx.showToast({
            title: "登录成功",
            icon: "success"
          });
        } catch (error) {
          wx.showToast({
            title: "登录接口待接入",
            icon: "none"
          });
        }
      }
    });
  },

  clearCart() {
    app.setCart([]);
    wx.showToast({
      title: "已清空",
      icon: "success"
    });
  }
});
