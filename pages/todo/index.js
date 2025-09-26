Page({
    data: {
        eatList: [],
        cookList: [],
        goList: [],
        orderedList: [],
        showInput: false,
        inputType: '',
        inputText: '',
        panelLabel: ''
    },

    onLoad() {
        this.waitForCloudInit(() => {
            this.loadTodoLists();
            this.loadOrderedDishes();
            this.setupTodoListsWatcher();
            this.setupOrderedDishesWatcher();
        });
    },

    onUnload() {
        if (this.todoWatcher) {
            this.todoWatcher.close();
            this.todoWatcher = null;
        }
        if (this.orderedWatcher) {
            this.orderedWatcher.close();
            this.orderedWatcher = null;
        }
    },

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

    loadTodoLists() {
        const db = wx.cloud.database();
        db.collection('todoLists').get({
            success: res => {
                console.log('加载 TODO 成功', res.data);
                const data = res.data;
                this.setData({
                    eatList: data.filter(item => item.type === 'eat'),
                    cookList: data.filter(item => item.type === 'cook'),
                    goList: data.filter(item => item.type === 'go')
                });
            },
            fail: err => {
                console.error('加载 TODO 失败', err);
                wx.showToast({ title: '加载 TODO 失败: ' + err.errMsg, icon: 'none' });
            }
        });
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

    setupTodoListsWatcher() {
        const db = wx.cloud.database();
        this.todoWatcher = db.collection('todoLists').watch({
            onChange: snapshot => {
                console.log('TODO 数据更新', snapshot.docs);
                const data = snapshot.docs;
                this.setData({
                    eatList: data.filter(item => item.type === 'eat'),
                    cookList: data.filter(item => item.type === 'cook'),
                    goList: data.filter(item => item.type === 'go')
                });
            },
            onError: err => {
                console.error('TODO 监听错误', err);
                wx.showToast({ title: 'TODO 监听失败: ' + err.errMsg, icon: 'none' });
                setTimeout(() => this.setupTodoListsWatcher(), 5000);
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
    },

    onTapAdd(e) {
        const inputType = e.currentTarget.dataset.type;
        const map = { eat: '想吃', cook: '想做', go: '想去' };
        this.setData({ showInput: true, inputType, panelLabel: map[inputType] || '', inputText: '' });
    },

    onInputChange(e) {
        this.setData({ inputText: e.detail.value });
    },

    onCancelInput() {
        this.setData({ showInput: false, inputText: '' });
    },

    onConfirmInput() {
        const text = (this.data.inputText || '').trim();
        if (!text) {
            this.onCancelInput();
            return;
        }
        const app = getApp();
        if (!app.globalData.cloudReady) {
            wx.showToast({ title: '云服务未准备好', icon: 'none' });
            return;
        }
        const db = wx.cloud.database();
        console.log('添加 TODO', { text, type: this.data.inputType });
        db.collection('todoLists').add({
            data: {
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                text,
                type: this.data.inputType,
                done: false,
                createdAt: new Date()
            },
            success: res => {
                console.log('添加 TODO 成功', res);
                this.onCancelInput();
            },
            fail: err => {
                console.error('添加 TODO 失败', err);
                wx.showToast({ title: `添加失败: ${err.errMsg || '未知错误'}`, icon: 'none' });
            }
        });
    },

    onRemoveItem(e) {
        const type = e.currentTarget.dataset.type;
        const id = e.currentTarget.dataset.id;
        const app = getApp();
        if (!app.globalData.cloudReady) {
            wx.showToast({ title: '云服务未准备好', icon: 'none' });
            return;
        }
        const db = wx.cloud.database();
        const collection = type === 'ordered' ? 'orderedDishes' : 'todoLists';
        console.log('删除项', { type, id });
        db.collection(collection).where({ id }).remove({
            success: res => {
                console.log('删除成功', res);
            },
            fail: err => {
                console.error('删除失败', err);
                wx.showToast({ title: `删除失败: ${err.errMsg || '未知错误'}`, icon: 'none' });
            }
        });
    },

    onToggleDone(e) {
        const type = e.currentTarget.dataset.type;
        const id = e.currentTarget.dataset.id;
        const app = getApp();
        if (!app.globalData.cloudReady) {
            wx.showToast({ title: '云服务未准备好', icon: 'none' });
            return;
        }
        const db = wx.cloud.database();
        const collection = type === 'ordered' ? 'orderedDishes' : 'todoLists';
        console.log('切换完成状态', { type, id });
        db.collection(collection).where({ id }).update({
            data: {
                done: !db.command.inc(1).gt(0)
            },
            success: res => {
                console.log('切换完成状态成功', res);
            },
            fail: err => {
                console.error('切换完成状态失败', err);
                wx.showToast({ title: `更新失败: ${err.errMsg || '未知错误'}`, icon: 'none' });
            }
        });
    },

    goIndex() { wx.reLaunch({ url: '/pages/index/index' }); },
    goWheel() { wx.reLaunch({ url: '/pages/wheel/index' }); },
    goTodo() { /* current */ }
});