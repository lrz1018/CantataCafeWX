const request = require("../utils/request");

function loginByWechat(data) {
  return request({
    url: "/api/v1/auth/wechat-login",
    method: "POST",
    data: typeof data === "string" ? { code: data } : data
  });
}

function getMe(options = {}) {
  return request({
    url: "/api/v1/me",
    toast: options.toast
  });
}

function updateProfile(data) {
  return request({
    url: "/api/v1/me/profile",
    method: "PUT",
    data
  });
}

module.exports = {
  loginByWechat,
  getMe,
  updateProfile
};
