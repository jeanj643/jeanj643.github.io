# SVG元素选择器

一个功能强大的Web应用，支持上传SVG文件并进行元素选择、坐标识别和距离计算。

## 🚀 功能特性

- **📁 文件上传**: 支持拖拽或点击上传SVG格式文件
- **🎯 元素选择**: 点击SVG中的任意元素进行选择
- **🔄 多选支持**: 按住Shift键进行多元素选择
- **📦 框选功能**: 长按左键拖拽鼠标进行框选
- **✨ 高亮显示**: 被选中的元素自动高亮并显示动画效果
- **📊 坐标信息**: 实时显示元素的位置坐标、尺寸信息
- **📏 距离计算**: 自动计算选中元素之间的距离
- **🔢 框选编号**: 保留框选痕迹并依次编号显示
- **📱 响应式设计**: 适配不同屏幕尺寸的设备

## 📋 支持的SVG元素

- 文本元素 (`text`)
- 基本形状 (`rect`, `circle`, `ellipse`)
- 线条 (`line`, `polyline`, `polygon`)
- 路径 (`path`)
- 分组元素 (`g`)

## 🎮 使用方法

1. **上传SVG文件**
   - 点击上传区域选择文件
   - 或直接拖拽SVG文件到上传区域

2. **选择元素**
   - 单击任意SVG元素进行选择
   - 按住 `Shift` 键可进行多选
   - 长按左键200ms拖拽鼠标进行框选
   - 选中的元素会显示红色虚线高亮效果
   - 框选痕迹会保留在画布上并编号

3. **管理框选痕迹**
   - 点击框选痕迹进行选中（红色高亮）
   - 拖拽框选痕迹可以移动位置
   - 选中框选痕迹后按 `Backspace` 键删除
   - 删除后自动重新编号排列

4. **查看信息**
   - 右侧面板显示选中元素的详细信息
   - 包括坐标位置、尺寸、属性等
   - 显示框选区域的坐标和尺寸信息
   - 多选时会自动计算元素间距

5. **距离计算**
   - 选择2个或更多元素时，自动计算：
     - 直线距离
     - 水平距离
     - 垂直距离
     - 整体布局信息

## 🎨 界面特色

- 现代化的渐变背景设计
- 流畅的动画过渡效果
- 直观的信息展示面板
- 响应式布局适配

## 💡 使用技巧

- 点击元素信息卡片可临时高亮对应元素
- 点击空白区域可清除所有选择
- 长按200ms会显示提示，移动鼠标超过5px会取消长按
- 框选痕迹半透明显示，悬停时会变明亮
- 选中的框选痕迹会显示红色边框和阴影
- 拖拽框选痕迹时坐标信息会实时更新
- 使用提供的 `demo.svg` 文件进行功能测试

## 🛠️ 技术实现

- 纯原生 JavaScript 实现，无依赖
- 使用 DOM API 进行SVG元素操作
- CSS3 动画和过渡效果
- 现代ES6+语法

## 📁 文件结构

```
.
├── index.html      # 主页面
├── styles.css      # 样式文件
├── script.js       # 脚本文件
├── demo.svg        # 示例SVG文件
└── README.md       # 说明文档
```

## 🌐 快速开始

1. 直接打开 `index.html` 文件
2. 上传SVG文件或使用提供的 `demo.svg`
3. 开始选择和分析SVG元素

## �� 支持

如有问题或建议，请随时反馈！ 