const request = require("../utils/request");

function listBanners() {
  return request({
    url: "/api/v1/banners"
  });
}

function listCategories() {
  return request({
    url: "/api/v1/categories"
  });
}

function listProducts(params = {}) {
  return request({
    url: "/api/v1/products",
    data: params
  });
}

function getProduct(id) {
  return request({
    url: `/api/v1/products/${id}`
  });
}

module.exports = {
  listBanners,
  listCategories,
  listProducts,
  getProduct
};
