Page({
    data: {
        categories: [
            { name: '炒菜' },
            { name: '炖菜' },
            { name: '料理' },
            { name: '凉菜' },
            { name: '主食' },
            { name: '甜品' },
            { name: '饮品' },
        ],
        sections: [],
        activeCategoryIndex: 0,
        scrollIntoView: '',
        cartCount: 0,
        cartItems: {},
        animating: {},
        showCartDrawer: false,
        cartList: [],
        dishes: [],
        orderedList: []
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
                title: '炖菜',
                items: []
            },
            {
                id: 'cat-2',
                title: '料理',
                items: []
            },
            {
                id: 'cat-3',
                title: '凉菜',
                items: [
                    { name: '拍黄瓜', desc: '清爽开胃', emoji: '🥒' },
                    { name: '凉拌木耳', desc: '脆爽可口', emoji: '🍄' }
                ]
            },
            {
                id: 'cat-4',
                title: '主食',
                items: [
                    { name: '牛肉面', desc: '汤浓味正', emoji: '🍜' },
                    { name: '炒饭', desc: '粒粒分明', emoji: '🍚' }
                ]
            },
            {
                id: 'cat-5',
                title: '甜品',
                items: [
                    { name: '双皮奶', desc: '香滑顺口', emoji: '🍮' },
                    { name: '芒果布丁', desc: '果香浓郁', emoji: '🥭' }
                ]
            },
            {
                id: 'cat-6',
                title: '饮品',
                items: [
                    { name: '柠檬茶', desc: '清新解腻', emoji: '🍋' },
                    { name: '拿铁', desc: '丝滑醇香', emoji: '☕' }
                ]
            }
        ];

        this.setData({ sections, scrollIntoView: sections[0].id });
        this.computeSectionTops();
        this.restoreCart();
        this.waitForCloudInit(() => {
            this.loadOrderedDishes();
            this.setupOrderedDishesWatcher();
        });
    },

    // Added: 从全局/本地恢复购物车数据
    restoreCart() {
        const app = getApp();
        let cartItems = app.globalData.cartItems;
        let cartCount = app.globalData.cartCount;

        // 如果全局为空，从本地存储恢复
        if (Object.keys(cartItems).length === 0) {
            const stored = wx.getStorageSync('cartItems');
            if (stored) {
                cartItems = stored.cartItems || {};
                cartCount = stored.cartCount || 0;
                // 同步到全局
                app.globalData.cartItems = cartItems;
                app.globalData.cartCount = cartCount;
            }
        }

        // 计算 cartList 并设置数据
        const cartList = Object.keys(cartItems).map(n => {
            const found = this.findDishByName(n);
            return { name: n, count: cartItems[n], emoji: found?.emoji || '', desc: found?.desc || '' };
        });

        this.setData({ cartItems, cartCount, cartList });
        console.log('购物车数据已恢复', { cartItems, cartCount });
    },

    // Added: Handle page show to reinitialize watcher on cache restoration
    onShow() {
        console.log('点菜页面 onShow');
        this.restoreCart();
        const app = getApp();
        if (app.globalData.cloudReady) {
            console.log('云环境已就绪，重新加载订单并设置监听');
            this.loadOrderedDishes();
            // Close existing watcher if it exists
            if (this.orderedWatcher) {
                this.orderedWatcher.close();
                this.orderedWatcher = null;
                console.log('关闭旧的订单监听器');
            }
            this.setupOrderedDishesWatcher();
        }
    },

    // Added: Close watcher when page is hidden (e.g., exit mini-program)
    onHide() {
        console.log('点菜页面 onHide');
        this.saveCart();
        if (this.orderedWatcher) {
            this.orderedWatcher.close();
            this.orderedWatcher = null;
            console.log('页面隐藏，关闭订单监听器');
        }
    },

    onUnload() {
        console.log('点菜页面 onUnload');
        this.saveCart();
        if (this.orderedWatcher) {
            this.orderedWatcher.close();
            this.orderedWatcher = null;
        }
    },

    saveCart() {
        const app = getApp();
        app.globalData.cartItems = this.data.cartItems;
        app.globalData.cartCount = this.data.cartCount;

        // 保存到本地存储（持久化）
        wx.setStorageSync('cartItems', {
            cartItems: this.data.cartItems,
            cartCount: this.data.cartCount
        });

        console.log('购物车数据已保存', { cartItems: this.data.cartItems, cartCount: this.data.cartCount });
    },

    // Wait for cloud initialization before running callback
    waitForCloudInit(callback) {
        const app = getApp();
        if (app.globalData.cloudReady) {
            console.log('云环境已就绪，直接执行');
            callback();
        } else {
            console.log('等待云环境初始化...');
            const checkInterval = setInterval(() => {
                if (app.globalData.cloudReady) {
                    clearInterval(checkInterval);
                    console.log('云环境初始化完成');
                    callback();
                }
            }, 500);
            setTimeout(() => {
                clearInterval(checkInterval);
                if (!app.globalData.cloudReady) {
                    console.error('云环境初始化超时');
                    wx.showToast({ title: '云服务不可用', icon: 'none' });
                }
            }, 10000); // 10s timeout
        }
    },

    loadOrderedDishes() {
        const db = wx.cloud.database();
        db.collection('orderedDishes').get({
            success: res => {
                console.log('加载订单成功', res.data);
                this.setData({ orderedList: res.data });
            },
            fail: err => {
                console.error('加载订单失败', err);
                wx.showToast({ title: '加载订单失败: ' + err.errMsg, icon: 'none' });
            }
        });
    },

    setupOrderedDishesWatcher() {
        const db = wx.cloud.database();
        this.orderedWatcher = db.collection('orderedDishes').watch({
            onChange: snapshot => {
                console.log('订单数据更新', snapshot.docs);
                this.setData({ orderedList: snapshot.docs });
            },
            onError: err => {
                console.error('订单监听错误', err);
                wx.showToast({ title: '订单监听失败: ' + err.errMsg, icon: 'none' });
                setTimeout(() => this.setupOrderedDishesWatcher(), 5000);
            }
        });
        console.log('订单监听器已设置'); // Added: Log to confirm watcher setup
    },

    computeSectionTops() {
        const query = wx.createSelectorQuery();
        query.selectAll('.section').boundingClientRect();
        query.select('.dishes-panel').boundingClientRect();
        query.exec(res => {
            const sectionRects = res[0] || [];
            const panelRect = res[1];
            if (!panelRect) return;
            this.sectionTops = sectionRects.map(r => r.top - panelRect.top);
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

        // Added: 同步到全局
        const app = getApp();
        app.globalData.cartItems = cartItems;
        app.globalData.cartCount = cartCount;

        setTimeout(() => {
            this.setData({ [`animating.${name}`]: false });
        }, 320);
    },

    onTapCart() {
        this.setData({ showCartDrawer: true });
    },

    // 添加 onCloseCart 方法
    onCloseCart() {
        this.setData({ showCartDrawer: false });
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

        // Added: 同步到全局
        const app = getApp();
        app.globalData.cartItems = cartItems;
        app.globalData.cartCount = cartCount;
    },

    onPlaceOrder() {
        if (this.data.cartCount === 0) {
            wx.showToast({ title: '购物车为空', icon: 'none' });
            return;
        }
        const app = getApp();
        if (!app.globalData.cloudReady) {
            wx.showToast({ title: '云服务未准备好', icon: 'none' });
            return;
        }
        const db = wx.cloud.database();
        const promises = this.data.cartList.map(item => {
            console.log('添加订单项', item);
            return db.collection('orderedDishes').add({
                data: {
                    id: Date.now() + Math.random().toString(36).substr(2, 9),
                    text: `${item.emoji} ${item.name} (${item.count}x)`,
                    done: false,
                    createdAt: new Date()
                }
            });
        });
        Promise.all(promises)
            .then(() => {
                console.log('订单提交成功');
                wx.showToast({ title: '订单已提交', icon: 'success' });
                this.setData({ cartItems: {}, cartCount: 0, cartList: [], showCartDrawer: false });
                // Added: 清空全局和本地
                app.globalData.cartItems = {};
                app.globalData.cartCount = 0;
                wx.removeStorageSync('cartItems');
                this.setData({ showCartDrawer: false });
            })
            .catch(err => {
                console.error('添加订单失败', err);
                wx.showToast({ title: `提交失败: ${err.errMsg || '未知错误'}`, icon: 'none' });
            });
    },

    findDishByName(name) {
        for (const section of this.data.sections) {
            for (const d of section.items) {
                if (d.name === name) return d;
            }
        }
        return null;
    },

    goIndex() { /* already on index */ },
    goWheel() { wx.redirectTo({ url: '/pages/wheel/index' }); },
    goTodo() { wx.redirectTo({ url: '/pages/todo/index' }); }
});