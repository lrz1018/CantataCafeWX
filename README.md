# CantataCafeWX

微信小程序前端基础框架，面向咖啡点单场景。

## 项目结构

```text
.
├── app.js                 # 小程序入口
├── app.json               # 全局页面、tabBar、窗口配置
├── app.wxss               # 全局样式
├── components/            # 通用组件
├── config/                # 环境配置
├── pages/                 # 页面
├── services/              # 业务接口封装
└── utils/                 # 通用工具
```

## 本地运行

1. 使用微信开发者工具打开本目录。
2. 在 `project.config.json` 中替换自己的 `appid`。
3. 在 `config/env.js` 中配置后端接口地址。
4. 点击“编译”预览基础页面。

## 已包含

- 原生微信小程序结构
- 首页、菜单、购物车、订单、我的五个基础页面
- 菜单卡片组件
- 请求工具封装
- 菜单、订单、用户服务层占位
- tabBar 与全局样式
