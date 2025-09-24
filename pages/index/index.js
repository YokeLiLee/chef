Page({
  data: {
    categories: [
      { name: '热菜' },
      { name: '凉菜' },
      { name: '主食' },
      { name: '甜品' },
      { name: '饮品' }
    ],
    sections: [],
    activeCategoryIndex: 0,
    scrollIntoView: '',
    cartCount: 0,
    cartItems: {},
    animating: {},
    showCartDrawer: false,
    cartList: []
  },
  onCloseCart() {
    this.setData({ showCartDrawer: false });
  },

  onLoad() {
    const sections = [
      {
        id: 'cat-0',
        title: '热菜',
        items: [
          { name: '宫保鸡丁', desc: '花生搭配微辣口感', emoji: '🍗' },
          { name: '鱼香肉丝', desc: '酸甜适口，回味无穷', emoji: '🥢' },
          { name: '红烧肉', desc: '入口即化的甜咸平衡', emoji: '🥘' }
        ]
      },
      {
        id: 'cat-1',
        title: '凉菜',
        items: [
          { name: '拍黄瓜', desc: '清爽开胃', emoji: '🥒' },
          { name: '凉拌木耳', desc: '脆爽可口', emoji: '🍄' }
        ]
      },
      {
        id: 'cat-2',
        title: '主食',
        items: [
          { name: '牛肉面', desc: '汤浓味正', emoji: '🍜' },
          { name: '炒饭', desc: '粒粒分明', emoji: '🍚' }
        ]
      },
      {
        id: 'cat-3',
        title: '甜品',
        items: [
          { name: '双皮奶', desc: '香滑顺口', emoji: '🍮' },
          { name: '芒果布丁', desc: '果香浓郁', emoji: '🥭' }
        ]
      },
      {
        id: 'cat-4',
        title: '饮品',
        items: [
          { name: '柠檬茶', desc: '清新解腻', emoji: '🍋' },
          { name: '拿铁', desc: '丝滑醇香', emoji: '☕' }
        ]
      }
    ];

    this.setData({ sections, scrollIntoView: sections[0].id });
  },
    // 新增：页面显示时恢复购物车数据
    onShow() {
        this.restoreCart();
    },

    // 新增：页面隐藏时保存购物车数据
    onHide() {
        this.saveCart();
    },

    onUnload() {
        this.saveCart();
    },

    // 新增：保存购物车到本地存储
    saveCart() {
        wx.setStorageSync('cartItems', this.data.cartItems);
        wx.setStorageSync('cartCount', this.data.cartCount);
    },

    // 从本地存储恢复购物车，并重新生成 cartList
    restoreCart() {
        const cartItems = wx.getStorageSync('cartItems') || {};
        const cartCount = wx.getStorageSync('cartCount') || 0;
        // 确保 sections 已加载（虽在 onLoad 中已 set，但为安全起见检查）
        if (this.data.sections.length === 0) {
            // 如果 sections 未就绪，延迟恢复（极少发生，但防异步问题）
            setTimeout(() => this.restoreCart(), 100);
            return;
        }
        const cartList = Object.keys(cartItems).map(n => {
            const found = this.findDishByName(n);
            return { name: n, count: cartItems[n], emoji: found?.emoji || '', desc: found?.desc || '' };
        });
        this.setData({
            cartItems,
            cartCount,
            cartList,
            animating: {}, // 重置动画状态
            showCartDrawer: false // 关闭抽屉状态
        });
    },

  onReady() {
    this.computeSectionTops();
  },

  computeSectionTops() {
    const query = wx.createSelectorQuery();
    query.selectAll('.section').boundingClientRect();
    query.select('.dishes-panel').boundingClientRect();
    query.exec(res => {
      const sectionRects = res[0] || [];
      const panelRect = res[1];
      if (!panelRect) return;
      const tops = sectionRects.map(r => r.top - panelRect.top);
      this.sectionTops = tops;
    });
  },

  onTapCategory(e) {
    const index = e.currentTarget.dataset.index;
    const id = `cat-${index}`;
    this.setData({ activeCategoryIndex: index, scrollIntoView: id });
  },

  onDishesScroll(e) {
    if (!this.sectionTops || this.sectionTops.length === 0) return;
    const scrollTop = e.detail.scrollTop;
    let currentIndex = 0;
    for (let i = 0; i < this.sectionTops.length; i += 1) {
      if (scrollTop >= this.sectionTops[i]) {
        currentIndex = i;
      } else {
        break;
      }
    }
    if (currentIndex !== this.data.activeCategoryIndex) {
      this.setData({ activeCategoryIndex: currentIndex });
    }
  },

  onAddDish(e) {
    const name = e.currentTarget.dataset.name;
    const cartItems = { ...this.data.cartItems };
    cartItems[name] = (cartItems[name] || 0) + 1;
    const cartCount = Object.values(cartItems).reduce((sum, n) => sum + n, 0);
    const animating = { ...this.data.animating, [name]: true };
    const cartList = Object.keys(cartItems).map(n => {
      const found = this.findDishByName(n);
      return { name: n, count: cartItems[n], emoji: found?.emoji || '', desc: found?.desc || '' };
    });
    this.setData({ cartItems, cartCount, animating, cartList });
    setTimeout(() => {
      this.setData({ [`animating.${name}`]: false });
    }, 320);
  },

  onTapCart() {
    this.setData({ showCartDrawer: true });
  },

  goIndex() {
    // already on index
  },
  goWheel() {
    wx.redirectTo({ url: '/pages/wheel/index' });
  },
  goTodo() {
    wx.redirectTo({ url: '/pages/todo/index' });
  },

  onRemoveCartItem(e) {
    const name = e.currentTarget.dataset.name;
    const cartItems = { ...this.data.cartItems };
    if (!cartItems[name]) return;
    delete cartItems[name];
    const cartCount = Object.values(cartItems).reduce((sum, n) => sum + n, 0);
    const cartList = Object.keys(cartItems).map(n => {
      const found = this.findDishByName(n);
      return { name: n, count: cartItems[n], emoji: found?.emoji || '', desc: found?.desc || '' };
    });
    this.setData({ cartItems, cartCount, cartList });
  },

    onPlaceOrder() {
        if (this.data.cartCount === 0) {
            wx.showToast({ title: '购物车为空', icon: 'none' });
            return;
        }
        // 格式化新项
        const newItems = this.data.cartList.map(item => ({
            id: Date.now() + Math.random() * 1000, // 生成唯一 ID
            text: `${item.emoji} ${item.name} (${item.count}x)`,
            done: false
        }));
        // 读取现有记录，追加新项
        const existingOrdered = wx.getStorageSync('orderedDishes') || [];
        const updatedOrdered = [...existingOrdered, ...newItems];
        wx.setStorageSync('orderedDishes', updatedOrdered);
        wx.showToast({ title: '订单已提交', icon: 'success' });
        this.setData({ cartItems: {}, cartCount: 0, cartList: [], showCartDrawer: false });
    },

  findDishByName(name) {
    for (const section of this.data.sections) {
      for (const d of section.items) {
        if (d.name === name) return d;
      }
    }
    return null;
  }
});

