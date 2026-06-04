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

function getOrder(id) {
  return request({
    url: `/api/v1/orders/${id}`
  });
}

module.exports = {
  createOrder,
  listOrders,
  getOrder
};
