function formatMoney(cents) {
  const value = Number(cents || 0) / 100;
  return `¥${value.toFixed(2)}`;
}

function formatCount(count) {
  return Number(count || 0);
}

module.exports = {
  formatMoney,
  formatCount
};
