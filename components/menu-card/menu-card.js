const { formatMoney } = require("../../utils/format");

Component({
  properties: {
    item: {
      type: Object,
      value: {}
    }
  },

  observers: {
    item(value) {
      this.setData({
        priceText: formatMoney(value.priceCents),
        itemInitial: value.name ? value.name.slice(0, 1) : "C",
        imageError: false
      });
    }
  },

  data: {
    priceText: "¥0.00",
    itemInitial: "C",
    imageError: false
  },

  methods: {
    handleOpen() {
      this.triggerEvent("open", this.properties.item);
    },

    handleAdd() {
      if (this.properties.item.soldOut) {
        return;
      }
      this.triggerEvent("add", this.properties.item);
    },

    handleImageError() {
      this.setData({ imageError: true });
    }
  }
});
