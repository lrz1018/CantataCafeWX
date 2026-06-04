const request = require("../utils/request");

function createOrder(data) {
  return request({
    url: "/api/orders",
    method: "POST",
    data
  });
}

function listOrders(params = {}) {
  return request({
    url: "/api/orders",
    data: params
  });
}

module.exports = {
  createOrder,
  listOrders
};
