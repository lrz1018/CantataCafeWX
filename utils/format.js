const { baseUrl } = require("../config/env");

function formatMoney(cents) {
  const value = Number(cents || 0) / 100;
  return `¥${value.toFixed(2)}`;
}

function formatCount(count) {
  return Number(count || 0);
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getStatusText(status) {
  const map = {
    PENDING: "待接单",
    ACCEPTED: "已接单",
    MAKING: "制作中",
    READY: "待取餐",
    COMPLETED: "已完成",
    CANCELLED: "已取消"
  };

  return map[status] || status || "";
}

function getMemberCardTypeText(type) {
  const map = {
    HALF_PRICE: "每日半价卡",
    FREE_ITEM: "每日免单卡"
  };

  return map[type] || type || "";
}

function getMemberCardSourceText(source) {
  const map = {
    PURCHASE: "购买获得",
    MANUAL: "后台发放"
  };

  return map[source] || source || "";
}

function getMemberCardStatusText(card = {}) {
  if (card.expired) {
    return "已过期";
  }

  if (card.status === "DISABLED") {
    return "已禁用";
  }

  if (card.usedToday) {
    return "今日已用";
  }

  if (card.status === "ACTIVE") {
    return "可用";
  }

  return card.status || "";
}

function getMemberCardPurchaseStatusText(status) {
  const map = {
    PENDING: "支付结果确认中",
    PAID: "已支付",
    FAILED: "支付失败",
    CLOSED: "已关闭"
  };

  return map[status] || status || "";
}

function summarizeProducts(products = []) {
  return products.map((item) => item.name).filter(Boolean).join("、");
}

function normalizeImageUrl(url) {
  if (!url) {
    return "";
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function summarizeOrderItems(items = []) {
  return items.map((item) => `${item.productName} x${item.quantity}`).join("、");
}

module.exports = {
  formatMoney,
  formatCount,
  formatDateTime,
  getStatusText,
  getMemberCardTypeText,
  getMemberCardSourceText,
  getMemberCardStatusText,
  getMemberCardPurchaseStatusText,
  normalizeImageUrl,
  summarizeOrderItems,
  summarizeProducts
};
