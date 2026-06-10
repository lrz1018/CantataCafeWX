const request = require("../utils/request");

function createOrder(data) {
  return request({
    url: "/api/v1/orders",
    method: "POST",
    data
  });
}

function listOrders() {
  return request({
    url: "/api/v1/orders"
  });
}

function getOrder(id, options = {}) {
  return request({
    url: `/api/v1/orders/${id}`,
    toast: options.toast
  });
}

function retryOrderPayment(id) {
  return request({
    url: `/api/v1/orders/${id}/pay`,
    method: "POST"
  });
}

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  retryOrderPayment
};
