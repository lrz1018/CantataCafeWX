const request = require("../utils/request");

function listMemberCardTemplates(options = {}) {
  return request({
    url: "/api/v1/member-card-templates",
    toast: options.toast
  });
}

function listMemberCards(options = {}) {
  return request({
    url: "/api/v1/member-cards",
    toast: options.toast
  });
}

function createMemberCardOrder(templateId) {
  return request({
    url: "/api/v1/member-card-orders",
    method: "POST",
    data: { templateId }
  });
}

function getMemberCardOrder(id, options = {}) {
  return request({
    url: `/api/v1/member-card-orders/${id}`,
    toast: options.toast
  });
}

module.exports = {
  listMemberCardTemplates,
  listMemberCards,
  createMemberCardOrder,
  getMemberCardOrder
};
