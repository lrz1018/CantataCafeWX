const { baseUrl } = require("../config/env");

function getAuthHeader(options = {}) {
  const app = getApp();
  const token = options.token || app.globalData.token || wx.getStorageSync("token") || "";
  const tokenType = options.tokenType || app.globalData.tokenType || wx.getStorageSync("tokenType") || "Bearer";

  return token ? { Authorization: `${tokenType} ${token}` } : {};
}

function handleUnauthorized() {
  const app = getApp();
  if (app && typeof app.clearAuth === "function") {
    app.clearAuth();
  }
}

function request(options) {
  const shouldToast = options.toast !== false;

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${options.url}`,
      method: options.method || "GET",
      data: options.data || {},
      header: {
        "content-type": "application/json",
        ...getAuthHeader(options),
        ...(options.header || {})
      },
      success(res) {
        const { statusCode, data } = res;
        const message = data && data.message ? data.message : "请求失败";

        if (statusCode >= 200 && statusCode < 300) {
          if (data && typeof data === "object" && Object.prototype.hasOwnProperty.call(data, "code")) {
            if (data.code === 0) {
              resolve(data.data);
              return;
            }

            if (data.code === 401) {
              handleUnauthorized();
            }

            if (shouldToast) {
              wx.showToast({
                title: data.message || "请求失败",
                icon: "none"
              });
            }
            reject({ ...data, handled: shouldToast });
            return;
          }

          resolve(data);
          return;
        }

        if (statusCode === 401) {
          handleUnauthorized();
        }

        if (shouldToast) {
          wx.showToast({
            title: statusCode === 401 ? "登录已失效，请重新登录" : message,
            icon: "none"
          });
        }
        reject({ ...res, message, handled: shouldToast });
      },
      fail(error) {
        if (shouldToast) {
          wx.showToast({
            title: "网络异常",
            icon: "none"
          });
        }
        reject({ ...error, handled: shouldToast });
      }
    });
  });
}

module.exports = request;
