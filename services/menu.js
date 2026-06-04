const request = require("../utils/request");

function listCategories() {
  return request({
    url: "/api/categories"
  });
}

function listProducts(params = {}) {
  return request({
    url: "/api/products",
    data: params
  });
}

module.exports = {
  listCategories,
  listProducts
};
