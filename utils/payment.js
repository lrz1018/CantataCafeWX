const { getOrder } = require("../services/order");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestWechatPayment(payParams) {
  return new Promise((resolve, reject) => {
    if (!payParams) {
      resolve({ skipped: true });
      return;
    }

    if (!payParams.timeStamp || !payParams.nonceStr || !payParams.packageValue || !payParams.paySign) {
      reject(new Error("微信支付参数不完整"));
      return;
    }

    wx.requestPayment({
      timeStamp: payParams.timeStamp,
      nonceStr: payParams.nonceStr,
      package: payParams.packageValue,
      signType: payParams.signType || "RSA",
      paySign: payParams.paySign,
      success: resolve,
      fail: reject
    });
  });
}

async function confirmOrderPayment(orderId, options = {}) {
  const maxRetries = Number(options.maxRetries == null ? 5 : options.maxRetries);
  const interval = Number(options.interval == null ? 2000 : options.interval);
  const shouldStop = typeof options.shouldStop === "function" ? options.shouldStop : () => false;
  const onOrder = typeof options.onOrder === "function" ? options.onOrder : null;
  let latestOrder = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (shouldStop()) {
      return null;
    }

    if (attempt > 0) {
      await delay(interval);
    }

    const order = await getOrder(orderId, { toast: false });
    latestOrder = order;
    if (onOrder) {
      onOrder(order);
    }

    if (order.paymentStatus !== "PENDING" || order.status === "CANCELLED") {
      return order;
    }
  }

  return latestOrder;
}

function isPaymentCancel(error) {
  const message = error && (error.errMsg || error.message || "");
  return /cancel/i.test(message);
}

module.exports = {
  confirmOrderPayment,
  delay,
  isPaymentCancel,
  requestWechatPayment
};
