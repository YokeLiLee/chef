Page({
    data: {
        eatList: [],
        cookList: [],
        goList: [],
        orderedList: [],
        showInput: false,
        inputType: '',
        inputText: '',
        panelLabel: '',
        draggingType: '', // Added: 当前拖动列表类型 (eat, cook, go, ordered)
        draggingIndex: -1, // Added: 当前拖动项索引
        draggingY: 0 // Added: 当前拖动 y 位置
    },

    onLoad() {
        this.waitForCloudInit(() => {
            this.loadTodoLists();
            this.loadOrderedDishes();
            this.setupTodoListsWatcher();
            this.setupOrderedDishesWatcher();
        });
    },

    // Added: 页面显示时重新加载数据和重设 watcher
    onShow() {
        console.log('TODO 页面 onShow');
        const app = getApp();
        if (app.globalData.cloudReady) {
            this.loadTodoLists();
            this.loadOrderedDishes();
            // 关闭旧 watcher，如果存在
            if (this.todoWatcher) {
                this.todoWatcher.close();
                this.todoWatcher = null;
            }
            if (this.orderedWatcher) {
                this.orderedWatcher.close();
                this.orderedWatcher = null;
            }
            this.setupTodoListsWatcher();
            this.setupOrderedDishesWatcher();
        }
    },

    // Added: 页面隐藏时关闭 watcher
    onHide() {
        console.log('TODO 页面 onHide');
        if (this.todoWatcher) {
            this.todoWatcher.close();
            this.todoWatcher = null;
        }
        if (this.orderedWatcher) {
            this.orderedWatcher.close();
            this.orderedWatcher = null;
        }
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
        // Modified: 按 order 排序加载
        db.collection('todoLists').orderBy('order', 'asc').get({
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
        // Modified: 按 order 排序加载
        db.collection('orderedDishes').orderBy('order', 'asc').get({
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
                    eatList: data.filter(item => item.type === 'eat').sort((a, b) => a.order - b.order), // Added: 实时排序
                    cookList: data.filter(item => item.type === 'cook').sort((a, b) => a.order - b.order),
                    goList: data.filter(item => item.type === 'go').sort((a, b) => a.order - b.order)
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
                this.setData({ orderedList: snapshot.docs.sort((a, b) => a.order - b.order) }); // Added: 实时排序
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
        const collection = 'todoLists'; // Only for todo, orders from index
        const type = this.data.inputType;
        const targetListKey = type + 'List';
        const currentList = this.data[targetListKey];
        const newOrder = currentList.length; // Added: Set initial order
        console.log('添加 TODO', { text, type, order: newOrder });
        db.collection(collection).add({
            data: {
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                text,
                type,
                done: false,
                order: newOrder, // Added: Initial order
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

    // Added: 长按开始拖动
    onLongPress(e) {
        const type = e.currentTarget.dataset.type;
        const index = e.currentTarget.dataset.index;
        console.log('长按开始拖动', { type, index });
        const animation = wx.createAnimation({
            duration: 200,
            timingFunction: 'ease',
        });
        animation.scale(1.1).step();
        this.setData({
            draggingType: type,
            draggingIndex: index,
            [`${type === 'ordered' ? 'orderedList' : type + 'List'}[${index}].animation`]: animation.export()
        });
    },

    // Added: 拖动移动
    onTouchMove(e) {
        const { draggingType, draggingIndex } = this.data;
        if (draggingIndex === -1 || !draggingType) return;
        const touchY = e.touches[0].pageY;
        const targetListKey = draggingType === 'ordered' ? 'orderedList' : draggingType + 'List';
        const targetList = this.data[targetListKey];
        // 计算新位置
        let newIndex = draggingIndex;
        if (touchY > this.data.draggingY) {
            newIndex = Math.min(draggingIndex + 1, targetList.length - 1);
        } else if (touchY < this.data.draggingY) {
            newIndex = Math.max(draggingIndex - 1, 0);
        }
        if (newIndex !== draggingIndex) {
            // 交换项
            const temp = targetList[draggingIndex];
            targetList.splice(draggingIndex, 1);
            targetList.splice(newIndex, 0, temp);
            this.setData({
                [targetListKey]: targetList.slice(),
                draggingIndex: newIndex
            });
        }
        this.setData({ draggingY: touchY });
    },

    // Added: 拖动结束
    onTouchEnd(e) {
        const { draggingType, draggingIndex } = this.data;
        if (draggingIndex === -1 || !draggingType) return;
        console.log('拖动结束', { type: draggingType, index: draggingIndex });
        const animation = wx.createAnimation({
            duration: 200,
            timingFunction: 'ease',
        });
        animation.scale(1).step();
        this.setData({
            [`${draggingType === 'ordered' ? 'orderedList' : draggingType + 'List'}[${draggingIndex}].animation`]: animation.export(),
            draggingIndex: -1,
            draggingType: '',
            draggingY: 0
        });
        // 持久化排序到数据库
        this.updateOrder(draggingType);
    },

    // Added: 更新数据库 order
    updateOrder(type) {
        const app = getApp();
        if (!app.globalData.cloudReady) {
            wx.showToast({ title: '云服务未准备好', icon: 'none' });
            return;
        }
        const db = wx.cloud.database();
        const collection = type === 'ordered' ? 'orderedDishes' : 'todoLists';
        const targetListKey = type === 'ordered' ? 'orderedList' : type + 'List';
        const targetList = this.data[targetListKey];
        const batchUpdates = targetList.map((item, index) => {
            return db.collection(collection).doc(item._id).update({
                data: { order: index }
            });
        });
        Promise.all(batchUpdates)
            .then(() => {
                console.log('排序持久化成功', { type });
            })
            .catch(err => {
                console.error('排序持久化失败', err);
                wx.showToast({ title: `排序保存失败: ${err.errMsg || '未知错误'}`, icon: 'none' });
            });
    },

    onToggleDone(e) {
        const type = e.currentTarget.dataset.type;
        const id = e.currentTarget.dataset.id;
        console.log('onToggleDone triggered', { type, id, value: e.detail.value }); // Modified: Log e.detail.value

        const app = getApp();
        if (!app.globalData.cloudReady) {
            wx.showToast({ title: '云服务未准备好', icon: 'none' });
            return;
        }
        const db = wx.cloud.database();
        const collection = type === 'ordered' ? 'orderedDishes' : 'todoLists';

        // Find item
        let targetListKey = type === 'ordered' ? 'orderedList' : type + 'List';
        let targetList = this.data[targetListKey];
        const itemIndex = targetList.findIndex(item => item.id === id);
        if (itemIndex === -1) {
            console.error('Item not found', { type, id });
            return;
        }
        const currentDone = targetList[itemIndex].done;
        // Modified: Use e.detail.value to determine newDone
        const newDone = e.detail.value.includes(id); // Checkbox checked if id in value array

        // Optimistic UI update
        targetList[itemIndex].done = newDone;
        this.setData({ [targetListKey]: targetList.slice() });

        console.log('切换完成状态', { type, id, newDone });
        const docId = targetList[itemIndex]._id;
        if (!docId) {
            console.error('Missing _id', { type, id });
            // Revert UI
            targetList[itemIndex].done = currentDone;
            this.setData({ [targetListKey]: targetList.slice() });
            return;
        }
        db.collection(collection).doc(docId).update({
            data: {
                done: newDone
            },
            success: res => {
                console.log('更新成功', res);
            },
            fail: err => {
                console.error('更新失败', err);
                wx.showToast({ title: `更新失败: ${err.errMsg || '未知错误'}`, icon: 'none' });
                // Revert UI
                targetList[itemIndex].done = currentDone;
                this.setData({ [targetListKey]: targetList.slice() });
            }
        });
    },

    goIndex() { wx.reLaunch({ url: '/pages/index/index' }); },
    goWheel() { wx.reLaunch({ url: '/pages/wheel/index' }); },
    goTodo() { /* current */ }
});