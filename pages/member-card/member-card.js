const app = getApp();
const {
  listMemberCardTemplates,
  listMemberCards,
  createMemberCardOrder,
  getMemberCardOrder
} = require("../../services/member-card");
const { ensureLogin } = require("../../utils/auth");
const {
  formatMoney,
  formatDateTime,
  getMemberCardTypeText,
  getMemberCardSourceText,
  getMemberCardStatusText,
  getMemberCardPurchaseStatusText,
  summarizeProducts
} = require("../../utils/format");
const { delay, requestWechatPayment } = require("../../utils/payment");

Page({
  data: {
    templates: [],
    myCards: [],
    loading: true,
    loginRequired: false,
    refreshing: false,
    purchasingTemplateId: "",
    pollingOrderId: "",
    purchaseStatusText: "",
    error: ""
  },

  onShow() {
    this.pollingStopped = false;
    this.enterPage();
  },

  onUnload() {
    this.pollingStopped = true;
  },

  onPullDownRefresh() {
    this.refreshAll().finally(() => wx.stopPullDownRefresh());
  },

  async enterPage() {
    this.setData({ loading: true, loginRequired: false, error: "" });
    try {
      await ensureLogin();
      await this.refreshAll();
    } catch (error) {
      this.setData({
        loading: false,
        loginRequired: !app.globalData.token,
        error: app.globalData.token ? "会员卡加载失败，请下拉重试" : ""
      });
    }
  },

  async refreshAll(options = {}) {
    if (!app.globalData.token) {
      this.setData({ loading: false, loginRequired: true });
      return;
    }

    this.setData({
      refreshing: true,
      error: options.keepError ? this.data.error : ""
    });

    try {
      const [templates, cards] = await Promise.all([
        listMemberCardTemplates({ toast: options.toast }),
        listMemberCards({ toast: options.toast })
      ]);

      app.setMemberCards(cards || []);
      this.setData({
        templates: (templates || []).map((item) => this.normalizeTemplate(item)),
        myCards: (cards || []).map((item) => this.normalizeCard(item)),
        loading: false,
        loginRequired: false,
        refreshing: false
      });
    } catch (error) {
      this.setData({
        loading: false,
        refreshing: false,
        error: "会员卡加载失败，请下拉重试"
      });
    }
  },

  normalizeTemplate(template) {
    return {
      ...template,
      typeText: getMemberCardTypeText(template.type),
      priceText: formatMoney(template.priceCents),
      validityText: `${template.validityDays || 0} 天`,
      productText: summarizeProducts(template.products || []) || "暂无适用商品",
      disabled: template.enabled === false
    };
  },

  normalizeCard(card) {
    const unusable = card.status !== "ACTIVE" || card.expired || card.usedToday;
    return {
      ...card,
      typeText: getMemberCardTypeText(card.type),
      sourceText: getMemberCardSourceText(card.source),
      statusText: getMemberCardStatusText(card),
      expiresAtText: formatDateTime(card.expiresAt),
      productText: summarizeProducts(card.products || []) || "暂无适用商品",
      unusable
    };
  },

  async loginAndLoad() {
    await this.enterPage();
  },

  async buyTemplate(event) {
    const templateId = event.currentTarget.dataset.id;
    const template = this.data.templates.find((item) => item.id === templateId);

    if (!template || template.disabled || this.data.purchasingTemplateId) {
      return;
    }

    this.setData({
      purchasingTemplateId: templateId,
      purchaseStatusText: "正在创建购买单..."
    });

    try {
      await ensureLogin();
      const order = await createMemberCardOrder(templateId);
      this.setData({
        pollingOrderId: order.id,
        purchaseStatusText: "正在调起微信支付..."
      });

      await requestWechatPayment(order.payParams || {});
      this.setData({ purchaseStatusText: "正在确认支付结果..." });
      await this.pollPurchaseOrder(order.id);
    } catch (error) {
      if (error && error.message === "会员卡已下架") {
        await this.refreshAll({ toast: false, keepError: true });
      }

      if (!error || !error.handled) {
        wx.showToast({
          title: error && error.message ? error.message : "支付未完成，可稍后刷新",
          icon: "none"
        });
      }
      this.setData({ purchaseStatusText: "" });
    } finally {
      this.setData({
        purchasingTemplateId: "",
        pollingOrderId: ""
      });
    }
  },

  async pollPurchaseOrder(orderId) {
    for (let attempt = 0; attempt <= 5; attempt += 1) {
      if (this.pollingStopped) {
        return;
      }

      if (attempt > 0) {
        await delay(2000);
      }

      const status = await getMemberCardOrder(orderId, { toast: false });
      const statusText = getMemberCardPurchaseStatusText(status.status);
      this.setData({ purchaseStatusText: statusText });

      if (status.status === "PAID") {
        app.markMemberCardsDirty();
        await this.refreshAll({ toast: false });
        wx.showToast({
          title: "会员卡已生效",
          icon: "success"
        });
        this.setData({ purchaseStatusText: "" });
        return;
      }

      if (status.status === "FAILED" || status.status === "CLOSED") {
        wx.showToast({
          title: statusText || "购买单已结束",
          icon: "none"
        });
        this.setData({ purchaseStatusText: "" });
        return;
      }
    }

    wx.showToast({
      title: "支付结果确认中，请稍后刷新",
      icon: "none"
    });
    this.setData({ purchaseStatusText: "支付结果确认中，请稍后刷新" });
  }
});
