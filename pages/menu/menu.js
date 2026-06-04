const app = getApp();

const categories = [
  { id: "all", name: "全部" },
  { id: "coffee", name: "咖啡" },
  { id: "tea", name: "茶饮" },
  { id: "dessert", name: "甜品" }
];

const products = [
  {
    id: "americano",
    categoryId: "coffee",
    name: "冰美式",
    description: "清爽、干净、带轻微果酸。",
    priceCents: 2200
  },
  {
    id: "latte",
    categoryId: "coffee",
    name: "拿铁",
    description: "浓缩咖啡与牛奶的经典组合。",
    priceCents: 2600
  },
  {
    id: "oolong",
    categoryId: "tea",
    name: "冷萃乌龙",
    description: "茶香清晰，入口顺滑。",
    priceCents: 2400
  },
  {
    id: "cheesecake",
    categoryId: "dessert",
    name: "巴斯克芝士蛋糕",
    description: "焦香表层与绵密芝士口感。",
    priceCents: 3200
  }
];

Page({
  data: {
    categories,
    products,
    filteredProducts: products,
    activeCategoryId: "all"
  },

  selectCategory(event) {
    const id = event.currentTarget.dataset.id;
    const filteredProducts = id === "all"
      ? products
      : products.filter((item) => item.categoryId === id);

    this.setData({
      activeCategoryId: id,
      filteredProducts
    });
  },

  addToCart(event) {
    const product = event.detail;
    const cart = app.globalData.cart.slice();
    const index = cart.findIndex((item) => item.id === product.id);

    if (index >= 0) {
      cart[index] = {
        ...cart[index],
        count: cart[index].count + 1
      };
    } else {
      cart.push({
        ...product,
        count: 1
      });
    }

    app.setCart(cart);
    wx.showToast({
      title: "已加入购物车",
      icon: "success"
    });
  }
});
