const { loginByWechat, getMe } = require("../services/user");

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res.code) {
          resolve(res.code);
          return;
        }
        reject(new Error("获取登录凭证失败"));
      },
      fail: reject
    });
  });
}

async function ensureLogin() {
  const app = getApp();
  if (app.globalData.token) {
    return app.globalData.userInfo;
  }

  const code = await wxLogin();
  const auth = await loginByWechat({ code });
  app.setAuth(auth);
  return auth.user;
}

async function refreshCurrentUser(options = {}) {
  const app = getApp();
  if (!app.globalData.token) {
    return null;
  }

  const user = await getMe(options);
  app.setUserInfo(user);
  return user;
}

module.exports = {
  ensureLogin,
  refreshCurrentUser
};
