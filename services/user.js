const request = require("../utils/request");

function loginByWechat(code) {
  return request({
    url: "/api/auth/wechat-login",
    method: "POST",
    data: { code }
  });
}

module.exports = {
  loginByWechat
};
