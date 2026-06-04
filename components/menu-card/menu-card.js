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
        itemInitial: value.name ? value.name.slice(0, 1) : "C"
      });
    }
  },

  data: {
    priceText: "¥0.00",
    itemInitial: "C"
  },

  methods: {
    handleAdd() {
      this.triggerEvent("add", this.properties.item);
    }
  }
});
