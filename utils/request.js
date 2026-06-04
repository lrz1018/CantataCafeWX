const { baseUrl } = require("../config/env");

function request(options) {
  const app = getApp();
  const token = app.globalData.token || wx.getStorageSync("token") || "";

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${options.url}`,
      method: options.method || "GET",
      data: options.data || {},
      header: {
        "content-type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {})
      },
      success(res) {
        const { statusCode, data } = res;

        if (statusCode >= 200 && statusCode < 300) {
          resolve(data);
          return;
        }

        wx.showToast({
          title: data && data.message ? data.message : "请求失败",
          icon: "none"
        });
        reject(res);
      },
      fail(error) {
        wx.showToast({
          title: "网络异常",
          icon: "none"
        });
        reject(error);
      }
    });
  });
}

module.exports = request;
